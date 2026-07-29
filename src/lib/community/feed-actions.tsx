"use server";

import { getMemberContext } from "@/lib/members/session";
import { listFeed, listPollResults, viewerCanPost } from "@/lib/community/queries";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { sanitizeQuery, type FeedQuery } from "@/lib/community/feed-query";
import { PostCard } from "@/components/community/post-card";

export type FeedPageResult = {
  /** Rendered cards for this page — PostCard is a server component, so the
   *  server action ships the finished RSC payload rather than raw rows the
   *  client would have to re-render (and would need a client PostCard for). */
  nodes: React.ReactNode;
  /** No further pages — the stream shows its caught-up marker and stops. */
  done: boolean;
};

const EMPTY: FeedPageResult = { nodes: null, done: true };

/**
 * One page of feed, rendered.
 *
 * SECURITY — this is a public endpoint, not a private helper. Anyone can call it
 * with any arguments, so it repeats every check the page did rather than trusting
 * the caller:
 *
 *  - **Signed in or nothing.** Logged-out visitors get a random 3-post preview and
 *    a wall; without this guard, calling the action directly would page through the
 *    entire feed and walk straight around that gate.
 *  - **The query is sanitized**, never passed through (see `sanitizeQuery`).
 *  - **`limit` is clamped.** An unbounded value would let one call pull the table.
 */
export async function loadFeedPage(
  query: FeedQuery,
  offset: number,
  limit: number,
): Promise<FeedPageResult> {
  const { user } = await getMemberContext();
  if (!user) return EMPTY;

  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 30);
  const safeOffset = Math.min(Math.max(Math.trunc(offset) || 0, 0), 100_000);
  const q = sanitizeQuery(query);

  const [canPost, posts] = await Promise.all([viewerCanPost(), listFeed({ ...q, limit: safeLimit, offset: safeOffset })]);
  if (posts.length === 0) return EMPTY;

  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  return {
    nodes: posts.map((post) => (
      <PostCard
        key={post.rowId}
        post={post}
        pollResult={pollResults[post.id]}
        canVote={canPost}
        viewerId={user.id}
        // On the bookmarks list, un-bookmarking pulls the card. Keyed off the
        // sanitized query so appended pages behave like the first one.
        removeOnUnbookmark={q.bookmarked === true}
      />
    )),
    // A short page means the source is exhausted; a full one might be the last,
    // and the next call returning zero rows settles it. One wasted request at the
    // end of a feed beats a phantom "caught up" on an exact multiple of the page.
    done: posts.length < safeLimit,
  };
}

/**
 * How many feed-eligible notes arrived after `sinceIso` — the number behind the
 * "N New Notes" pill.
 *
 * SECURITY — same public-endpoint discipline as loadFeedPage: signed-in only,
 * and it hands the RPC nothing but a timestamp and a boolean. The RPC derives
 * the viewer from auth.uid() and applies the same mute/audience/publish filters
 * as the feed, so it can't be used to probe another viewer's feed or count
 * hidden posts.
 */
export async function countNewNotes(query: FeedQuery, sinceIso: string): Promise<number> {
  const { user } = await getMemberContext();
  if (!user) return 0;

  // Reject a junk watermark rather than trusting it into the query.
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return 0;

  const q = sanitizeQuery(query);
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_new_count", {
    p_since: since.toISOString(),
    p_following: q.following,
  });
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}
