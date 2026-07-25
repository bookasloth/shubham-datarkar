"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { validatePost } from "./validate";
import { notifyReply, notifyMentions } from "./community-notify";
import { clampParentDepth } from "./reply-depth";
import { GATE } from "./gate-messages";

export type EngageResult = { ok: true } | { error: string };

/** Auth + post gate shared by every engagement write. */
async function gate() {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, error: GATE.SIGNED_OUT };
  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { sb, user: null, error: GATE.UNVERIFIED };
  return { sb, user, error: null };
}

export async function toggleVote(postId: string, value: 1 | -1): Promise<EngageResult> {
  const { sb, user, error } = await gate();
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
  // No revalidatePath here: the client bar is authoritative for the viewer's own
  // vote and reconciles in place, so revalidating would force a needless
  // whole-feed RSC refetch after every tap (and fight the optimistic update). The
  // DB write is the source of truth on the next full load. [[community-optimistic-feed]]
  return { ok: true };
}

export async function toggleBookmark(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
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
  const { sb, user, error } = await gate();
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
  const { sb, user, error } = await gate();
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

  // Same notify contract as a reply/mention: tell the quoted author, and anyone
  // @-mentioned in the quote body, once each.
  await notifyMentions(
    valid.body ?? "",
    user.id,
    `https://shubhamdatarkar.com/community/p/${source.public_id}`,
    [source.user_id as string],
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
  if (!user) return { error: GATE.SIGNED_OUT };

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
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

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
  // The rendered URL keys on public_id, not this UUID — revalidate the whole
  // dynamic segment rather than a path that would never match.
  revalidatePath("/community/p/[id]", "page");
  return { ok: true };
}

export async function createReply(postId: string, body: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? GATE.SIGNED_OUT };

  const valid = validatePost({ type: "text", body, imageCount: 0, youtubeUrl: "" });
  if (!valid.ok) return { error: valid.error };

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
    type: "text",
    body: valid.body,
  });
  if (err) return { error: err.message };
  // Notify the DIRECT parent author only (whoever owns the row we attached to),
  // never the whole ancestor chain — one email per reply.
  await notifyReply(parentId, user.id, valid.body ?? "");
  // Exclude the parent author: notifyReply already emailed them about this same
  // reply, and mentioning them in it shouldn't earn a second copy.
  await notifyMentions(
    valid.body ?? "",
    user.id,
    `https://shubhamdatarkar.com/community/p/${target.public_id}`,
    [parentNode.user_id],
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
