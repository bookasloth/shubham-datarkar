"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { validatePost } from "./validate";

export type EngageResult = { ok: true } | { error: string };

/** Auth + post gate shared by every engagement write. */
async function gate() {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, error: "Sign in first." as const };
  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { sb, user: null, error: "Verify your email first." as const };
  return { sb, user, error: null };
}

export async function toggleVote(postId: string, value: 1 | -1): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

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
  revalidatePath("/community");
  return { ok: true };
}

export async function toggleBookmark(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

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
  revalidatePath("/community");
  revalidatePath("/community/bookmarks");
  return { ok: true };
}

export async function toggleReblog(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

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

  const { error } = await sb.from("community_reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason: reason.trim().slice(0, 300) || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Delete your own post. The `.eq("user_id")` is belt-and-braces next to the
 *  community_posts_delete RLS policy. Cascades remove replies/votes/bookmarks. */
export async function deleteOwnPost(postId: string): Promise<EngageResult> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

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
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const { data: post } = await sb
    .from("community_posts")
    .select("type, poll")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.type !== "poll" || !post.poll) return { error: "That isn't a poll." };

  const poll = post.poll as { options: { i: number }[]; closes_at?: string };
  if (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now()) {
    return { error: "This poll has closed." };
  }
  if (!poll.options.some((o) => o.i === optionIndex)) return { error: "Unknown option." };

  const { error: err } = await sb
    .from("community_poll_votes")
    .insert({ post_id: postId, user_id: user.id, option_index: optionIndex });
  if (err) {
    // 23505 = unique violation on (post_id, user_id): vote is once-only by design.
    if (err.code === "23505") return { error: "You already voted." };
    return { error: err.message };
  }
  revalidatePath("/community");
  revalidatePath(`/community/p/${postId}`);
  return { ok: true };
}

export async function createReply(postId: string, body: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const valid = validatePost({ type: "text", body, imageCount: 0, youtubeUrl: "" });
  if (!valid.ok) return { error: valid.error };

  // 1-level threading: you may only reply to a root post.
  const { data: parent } = await sb
    .from("community_posts")
    .select("id, parent_id")
    .eq("id", postId)
    .maybeSingle();
  if (!parent) return { error: "That post no longer exists." };
  if (parent.parent_id) return { error: "You can't reply to a reply." };

  const { error: err } = await sb.from("community_posts").insert({
    user_id: user.id,
    parent_id: postId,
    type: "text",
    body: valid.body,
  });
  if (err) return { error: err.message };
  revalidatePath(`/community/p/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}
