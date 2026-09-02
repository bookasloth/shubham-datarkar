"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { validatePost } from "./validate";
import { uploadCommunityImages } from "./upload-images";
import { notifyReply, notifyMentions } from "./community-notify";
import { notify } from "./notify";
import { clampParentDepth } from "./reply-depth";
import { GATE } from "./gate-messages";
import { withinCommunityLimit, type LimitAction } from "./limits";

export type EngageResult = { ok: true } | { error: string };

/** Auth + post gate shared by every engagement write. Pass an action to also
 *  enforce that action's per-user rate budget — over budget returns GATE.RATE
 *  before any DB write happens. */
async function gate(action?: LimitAction) {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, error: GATE.SIGNED_OUT };
  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { sb, user: null, error: GATE.UNVERIFIED };
  if (action && !(await withinCommunityLimit(user.id, action))) {
    return { sb, user: null, error: GATE.RATE };
  }
  return { sb, user, error: null };
}

export async function toggleVote(postId: string, value: 1 | -1): Promise<EngageResult> {
  const { sb, user, error } = await gate("vote");
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  const { data: existing } = await sb
    .from("community_votes")
    .select("value")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Counter triggers keep up_count/down_count correct across all three paths.
  let err;
  if (!existing) {
    ({ error: err } = await sb
      .from("community_votes")
      .insert({ post_id: postId, user_id: user.id, value }));
  } else if (existing.value === value) {
    ({ error: err } = await sb
      .from("community_votes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id));
  } else {
    ({ error: err } = await sb
      .from("community_votes")
      .update({ value })
      .eq("post_id", postId)
      .eq("user_id", user.id));
  }
  if (err) return { error: err.message };
  // Notify the post owner on a NEW up-vote only — not on unvote (existing) and
  // not on a down-vote (removed feature; value is always 1). notify() skips
  // self and muted, and never throws.
  if (!existing && value === 1) {
    const { data: owner } = await sb
      .from("community_posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();
    if (owner?.user_id) {
      await notify({ recipientId: owner.user_id as string, actorId: user.id, verb: "like", postId });
    }
  }
  // No revalidatePath here: the client bar is authoritative for the viewer's own
  // vote and reconciles in place, so revalidating would force a needless
  // whole-feed RSC refetch after every tap (and fight the optimistic update). The
  // DB write is the source of truth on the next full load. [[community-optimistic-feed]]
  return { ok: true };
}

export async function toggleBookmark(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate("bookmark");
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  const { data: existing } = await sb
    .from("community_bookmarks")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: err } = existing
    ? await sb.from("community_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id)
    : await sb.from("community_bookmarks").insert({ post_id: postId, user_id: user.id });
  if (err) return { error: err.message };
  // Client bar is authoritative; skip the feed refetch. The bookmarks page reads
  // the DB fresh on its own load, so it needs no revalidation from here either.
  return { ok: true };
}

export async function toggleReblog(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate("reblog");
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  const { data: existing } = await sb
    .from("community_posts")
    .select("id")
    .eq("reblog_of", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: err } = existing
    ? await sb.from("community_posts").delete().eq("id", existing.id)
    : await sb.from("community_posts").insert({ user_id: user.id, type: "text", reblog_of: postId });
  if (err) {
    // 23505 = the community_posts_reblog_once index: a concurrent click already
    // reblogged this post. Treat as success — the end state is what was wanted.
    if (err.code === "23505") return { ok: true };
    return { error: err.message };
  }
  // Notify the source author on a new reblog (insert path only, not un-reblog).
  if (!existing) {
    const { data: src } = await sb
      .from("community_posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();
    if (src?.user_id) {
      await notify({ recipientId: src.user_id as string, actorId: user.id, verb: "reblog", postId });
    }
  }
  // Client bar is authoritative; skip the feed refetch.
  return { ok: true };
}

/**
 * Quote reblog — a reblog row that carries the quoter's own words.
 *
 * Unlike toggleReblog this is NOT idempotent: you may quote the same post more
 * than once (each quote is a distinct comment on it), so it always inserts and
 * there is no toggle. The bare-reblog button's filled state keeps reflecting
 * bare reblogs only, so the toggle never lies about a quote.
 */
export async function createQuote(postId: string, body: string): Promise<EngageResult> {
  const { sb, user, error } = await gate("quote");
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  // A quote must say something — reuse the text-post rules (500 cap, non-empty,
  // blocklist). The DB row is type 'quote'; validation only vets the body.
  const valid = validatePost({ type: "text", body, imageCount: 0, youtubeUrl: "" });
  if (!valid.ok) return { error: valid.error };

  // The source must exist and be a real root/quotable post. Quoting a reblog
  // points at the reblog's source instead, so one level of nesting renders.
  const { data: source } = await sb
    .from("community_posts")
    .select("id, reblog_of, hidden, public_id, user_id, body")
    .eq("id", postId)
    .maybeSingle();
  if (!source || source.hidden) return { error: "That post no longer exists." };
  // Quoting a quote/reblog: attach to the ultimate source so the embed is one
  // level deep, matching the render (the spec's "collapse to a link" rule).
  const target = source.reblog_of ?? source.id;

  const { error: err } = await sb.from("community_posts").insert({
    user_id: user.id,
    type: "quote",
    reblog_of: target,
    body: valid.body,
  });
  if (err) return { error: err.message };

  // In-app: tell the quoted author. Then the email/in-app mention fan-out for
  // anyone @-mentioned in the quote body (excluding the quoted author, already
  // notified here).
  await notify({ recipientId: source.user_id as string, actorId: user.id, verb: "quote", postId: source.id as string });
  await notifyMentions(
    valid.body ?? "",
    user.id,
    `https://shubhamdatarkar.com/community/p/${source.public_id}`,
    [source.user_id as string],
    source.id as string,
  );
  revalidatePath("/community");
  return { ok: true };
}

/** Report a post. Deliberately does NOT require community_can_post — a banned
 *  user must still be able to report abuse. */
export async function reportPost(postId: string, reason: string): Promise<EngageResult> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sign in to report." };
  // Rate-limited on the user (report has no community_can_post gate — a banned
  // user must still be able to report abuse — so the limit is the only brake on
  // a report flood burying the moderation queue).
  if (!(await withinCommunityLimit(user.id, "report"))) return { error: GATE.RATE };

  const { error } = await sb.from("community_reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason: reason.trim().slice(0, 300) || null,
  });
  // 23505 = the (post_id, reporter_id) unique index: you already reported this
  // post. Idempotent — the end state is what was wanted, so report success.
  if (error && error.code !== "23505") return { error: error.message };
  return { ok: true };
}

/** Delete your own post. The `.eq("user_id")` is belt-and-braces next to the
 *  community_posts_delete RLS policy. Cascades remove replies/votes/bookmarks. */
export async function deleteOwnPost(postId: string): Promise<EngageResult> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: GATE.SIGNED_OUT };
  if (!(await withinCommunityLimit(user.id, "delete"))) return { error: GATE.RATE };

  const { error } = await sb
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

export async function voteOnPoll(postId: string, optionIndex: number): Promise<EngageResult> {
  const { sb, user, error } = await gate("poll_vote");
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  // All checks (is-a-poll, live, valid option, not closed, once-only) now live in
  // the community_poll_vote definer RPC — the table's direct insert is revoked, so
  // this is the only write path and a raw PostgREST call can't bypass the rules.
  const { data: code, error: err } = await sb.rpc("community_poll_vote", {
    p_post: postId,
    p_option: optionIndex,
  });
  if (err) return { error: err.message };
  const MESSAGE: Record<string, string> = {
    not_poll: "That isn't a poll.",
    draft: "That poll isn't live yet.",
    unknown_option: "Unknown option.",
    closed: "This poll has closed.",
    already: "You already voted.",
    signed_out: GATE.SIGNED_OUT,
  };
  if (code !== "ok") return { error: MESSAGE[code as string] ?? "Couldn't record your vote." };
  revalidatePath("/community");
  // The rendered URL keys on public_id, not this UUID — revalidate the whole
  // dynamic segment rather than a path that would never match.
  revalidatePath("/community/p/[id]", "page");
  return { ok: true };
}

export async function createReply(
  postId: string,
  body: string,
  images: File[] = [],
): Promise<EngageResult> {
  const { sb, user, error } = await gate("reply");
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  const files = images.filter((f) => f && f.size > 0);
  const type = files.length ? "image" : "text";
  const valid = validatePost({ type, body, imageCount: files.length, youtubeUrl: "" });
  if (!valid.ok) return { error: valid.error };

  // Upload only after validation passes, so a rejected reply leaves no orphans.
  let imageUrls: string[] | null = null;
  if (files.length) {
    const up = await uploadCommunityImages(user.id, files);
    if ("error" in up) return { error: up.error };
    imageUrls = up.urls;
  }

  // Threading is capped at depth 3 (root → reply → reply → reply). Walk the
  // target's ancestry to find its depth, then parent the new reply so it lands
  // at depth ≤ 3: reply under the target when that keeps it in bounds, else
  // re-point to the target's depth-2 ancestor so it becomes a depth-3 sibling.
  // Silent re-parenting beats the old dead-end "you can't reply to a reply".
  const chain = await ancestryChain(sb, postId);
  if (chain.length === 0) return { error: "That post no longer exists." };
  const target = chain[0]; // depth of target = chain.length - 1 (root post = 0)
  const targetDepth = chain.length - 1;
  // chain is target-first (depth targetDepth, …, 0). The clamped parent depth
  // picks the ancestor to attach under so the new reply lands at depth ≤ 3.
  const parentNode = chain[targetDepth - clampParentDepth(targetDepth)];
  const parentId = parentNode.id;

  const { error: err } = await sb.from("community_posts").insert({
    user_id: user.id,
    parent_id: parentId,
    type,
    body: valid.body,
    images: imageUrls,
  });
  if (err) return { error: err.message };
  // Notify the DIRECT parent author only (whoever owns the row we attached to),
  // never the whole ancestor chain — one email per reply.
  await notifyReply(parentId, user.id, valid.body ?? "");
  // In-app reply notification to the same direct parent author.
  await notify({ recipientId: parentNode.user_id, actorId: user.id, verb: "reply", postId: target.id });
  // Exclude the parent author: notifyReply already notified them about this same
  // reply, and mentioning them in it shouldn't earn a second copy.
  await notifyMentions(
    valid.body ?? "",
    user.id,
    `https://shubhamdatarkar.com/community/p/${target.public_id}`,
    [parentNode.user_id],
    target.id,
  );
  revalidatePath("/community/p/[id]", "page");
  revalidatePath("/community");
  return { ok: true };
}

type AncestorRow = { id: string; user_id: string; public_id: string; parent_id: string | null };

/** The target post plus its ancestors, target-first up to the root, bounded to
 *  the 4 rows a depth-3 thread can hold. One query per hop — rare (only on a
 *  reply write) and never more than 4 deep, so no recursive RPC is warranted. */
async function ancestryChain(
  sb: Awaited<ReturnType<typeof supabaseAuthServer>>,
  postId: string,
): Promise<AncestorRow[]> {
  const chain: AncestorRow[] = [];
  let cursor: string | null = postId;
  for (let hop = 0; hop < 5 && cursor; hop++) {
    const { data } = await sb
      .from("community_posts")
      .select("id, user_id, public_id, parent_id")
      .eq("id", cursor)
      .maybeSingle();
    if (!data) break;
    const row = data as AncestorRow;
    chain.push(row);
    cursor = row.parent_id;
  }
  return chain;
}
