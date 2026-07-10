"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validatePost } from "./validate";

const BUCKET = "community-media";
const MAX_BYTES = 5 * 1024 * 1024;

export type CreatePostState = { error?: string; ok?: boolean } | undefined;

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

  const files = (formData.getAll("images") as File[]).filter((f) => f && f.size > 0);
  const valid = validatePost({
    type: String(formData.get("type") ?? "text"),
    body: String(formData.get("body") ?? ""),
    imageCount: files.length,
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
    pollOptions: formData.getAll("pollOptions").map((o) => String(o)),
    pollClosesAt: String(formData.get("pollClosesAt") ?? ""),
  });
  if (!valid.ok) return { error: valid.error };

  // Upload only after validation passes, so rejected posts leave no orphans.
  let imageUrls: string[] | null = null;
  if (valid.type === "image") {
    for (const f of files) {
      if (f.size > MAX_BYTES) return { error: "Each image must be under 5MB." };
      if (!f.type.startsWith("image/")) return { error: "Images only." };
    }
    const admin = supabaseAdmin();
    const urls: string[] = [];
    for (const f of files) {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { error } = await admin.storage.from(BUCKET).upload(path, f, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
      if (error) return { error: `Upload failed: ${error.message}` };
      urls.push(admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    // Full public URLs — next.config already allows this host for next/image.
    imageUrls = urls;
  }

  // Insert as the user: the community_posts_insert RLS policy is the final gate.
  const { error } = await sb.from("community_posts").insert({
    user_id: user.id,
    type: valid.type,
    body: valid.body,
    images: imageUrls,
    youtube_id: valid.youtubeId,
    poll: valid.poll,
  });
  if (error) return { error: error.message };

  revalidatePath("/community");
  return { ok: true };
}
