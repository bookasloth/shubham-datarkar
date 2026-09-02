"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { validatePost } from "./validate";
import { notifyPostCreated, notifyMentions } from "./community-notify";
import { unfurl } from "./unfurl";
import { uploadCommunityImages } from "./upload-images";
import { withinCommunityLimit } from "./limits";
import { GATE } from "./gate-messages";
import type { PostMeta } from "./types";

export type CreatePostState =
  | { error?: string; ok?: boolean; state?: "live" | "draft" | "scheduled"; publicId?: string }
  | undefined;

export async function createPost(
  _prev: CreatePostState,
  formData: FormData,
): Promise<CreatePostState> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sign in to post." };

  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { error: "Verify your email to post." };

  // Rate-limit before validation/upload so a flood can't burn image-storage or
  // the mention-email fanout (posting is the amplifier's throttle: capped posts
  // → capped emails).
  if (!(await withinCommunityLimit(user.id, "post"))) return { error: GATE.RATE };

  const files = (formData.getAll("images") as File[]).filter((f) => f && f.size > 0);
  const valid = validatePost({
    type: String(formData.get("type") ?? "text"),
    body: String(formData.get("body") ?? ""),
    imageCount: files.length,
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
    pollOptions: formData.getAll("pollOptions").map((o) => String(o)),
    pollClosesAt: String(formData.get("pollClosesAt") ?? ""),
    pollMode: String(formData.get("pollMode") ?? ""),
    pollCorrect: String(formData.get("pollCorrect") ?? ""),
    title: String(formData.get("title") ?? ""),
    source: String(formData.get("source") ?? ""),
    linkUrl: String(formData.get("linkUrl") ?? ""),
    tags: formData.getAll("tags").map((t) => String(t)),
    place: String(formData.get("place") ?? ""),
    audience: String(formData.get("audience") ?? "everyone"),
    publishAt: String(formData.get("publishAt") ?? ""),
    saveDraft: formData.get("saveDraft") === "1",
  });
  if (!valid.ok) return { error: valid.error };

  // No embeddability gate: YouTube's oEmbed returns 401 for plenty of videos
  // that DO embed fine, so blocking on it rejected valid links. A genuinely
  // embed-disabled video just shows YouTube's "unavailable" on the card — a rare,
  // low-harm outcome that isn't worth false-rejecting good posts for.

  // Unfurl a link post server-side (SSRF-safe fetch, best-effort) and fold the
  // OG card into meta. Done here, not in validatePost, so validation stays pure.
  let meta: PostMeta | null = valid.meta;
  if (valid.type === "link" && valid.meta?.url) {
    const card = await unfurl(valid.meta.url);
    meta = {
      ...valid.meta,
      ...(card.title ? { link_title: card.title } : {}),
      ...(card.desc ? { link_desc: card.desc } : {}),
      ...(card.image ? { link_image: card.image } : {}),
    };
  }

  // Upload only after validation passes, so rejected posts leave no orphans.
  let imageUrls: string[] | null = null;
  if (valid.type === "image") {
    const up = await uploadCommunityImages(user.id, files);
    if ("error" in up) return { error: up.error };
    // Full public URLs — next.config already allows this host for next/image.
    imageUrls = up.urls;
  }

  // Insert as the user: the community_posts_insert RLS policy is the final gate.
  const { data: inserted, error } = await sb
    .from("community_posts")
    .insert({
      user_id: user.id,
      type: valid.type,
      body: valid.body,
      images: imageUrls,
      youtube_id: valid.youtubeId,
      poll: valid.poll,
      meta,
      tags: valid.tags,
      audience: valid.audience,
      // undefined → column default now() (publish immediately); null → draft;
      // ISO string → scheduled. Only send the key when it's not "now".
      ...(valid.publishAt !== undefined ? { publish_at: valid.publishAt } : {}),
    })
    .select("public_id")
    .maybeSingle();
  if (error) return { error: error.message };

  // A draft or a future-scheduled post isn't live yet, so don't announce it or
  // fire mention emails — those go out when it actually publishes would be ideal,
  // but for now a draft simply stays quiet. A live post notifies as before.
  const isLive = valid.publishAt === undefined;
  if (isLive) {
    const href = inserted?.public_id
      ? `https://shubhamdatarkar.com/community/p/${inserted.public_id}`
      : "https://shubhamdatarkar.com/community";
    await notifyPostCreated(user.id, href);
    await notifyMentions(valid.body ?? "", user.id, href);
  }

  revalidatePath("/community");
  revalidatePath("/community/me");
  return {
    ok: true,
    state: isLive ? "live" : valid.publishAt === null ? "draft" : "scheduled",
    publicId: inserted?.public_id != null ? String(inserted.public_id) : undefined,
  };
}

/** Publish a draft/scheduled post now: flip publish_at to now(). This is a state
 *  change, not an edit (edit-post is out of scope) — the .eq("user_id") plus the
 *  RLS update policy keep it to the owner's own rows. Fires the same notices a
 *  fresh live post does. */
export async function publishDraft(postId: string): Promise<{ ok: true } | { error: string }> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sign in to publish." };
  if (!(await withinCommunityLimit(user.id, "publish"))) return { error: GATE.RATE };

  const { data: row, error } = await sb
    .from("community_posts")
    .update({ publish_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", user.id)
    .select("public_id, body")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!row) return { error: "That draft no longer exists." };

  const href = `https://shubhamdatarkar.com/community/p/${row.public_id}`;
  await notifyPostCreated(user.id, href);
  await notifyMentions((row.body as string) ?? "", user.id, href);

  revalidatePath("/community");
  revalidatePath("/community/me");
  return { ok: true };
}
