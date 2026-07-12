import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { AdSlot, FeedPost, FeedSort, FeedWindow, PollResult } from "./types";

/** Every community_* RPC returns this row shape — map it in exactly one place. */
function mapRow(r: Record<string, unknown>): FeedPost {
  const poll = (r.poll as FeedPost["poll"]) ?? null;
  return {
    pollClosed: Boolean(poll?.closes_at && new Date(poll.closes_at).getTime() <= Date.now()),
    rowId: (r.row_id as string) ?? (r.id as string),
    rebloggedBy: (r.reblogged_by as string) ?? null,
    id: r.id as string,
    publicId: String(r.public_id),
    userId: r.user_id as string,
    username: r.username as string,
    displayName: (r.display_name as string) ?? null,
    badge: r.badge as FeedPost["badge"],
    type: r.type as FeedPost["type"],
    body: (r.body as string) ?? null,
    images: (r.images as string[]) ?? null,
    youtubeId: (r.youtube_id as string) ?? null,
    poll,
    upCount: r.up_count as number,
    downCount: r.down_count as number,
    score: r.score as number,
    replyCount: r.reply_count as number,
    reblogCount: r.reblog_count as number,
    // ?? 0 so a DB that hasn't run the bookmark_count migration yet (or the
    // dormant community_post(uuid) shim, which doesn't return it) renders 0
    // instead of NaN.
    bookmarkCount: (r.bookmark_count as number) ?? 0,
    reblogOf: (r.reblog_of as string) ?? null,
    createdAt: r.created_at as string,
    viewerVote: ((r.viewer_vote as number) ?? 0) as -1 | 0 | 1,
    viewerBookmarked: Boolean(r.viewer_bookmarked),
    viewerReblogged: Boolean(r.viewer_reblogged),
  };
}

export async function listFeed(opts: {
  sort: FeedSort;
  window: FeedWindow;
  limit?: number;
  offset?: number;
  author?: string;
  bookmarked?: boolean;
  reblogged?: boolean;
  liked?: boolean;
}): Promise<FeedPost[]> {
  // Call as the request user (cookie-scoped): the RPC derives the viewer from
  // auth.uid(), so vote/bookmark state can't be spoofed for another user.
  const sb = await supabaseAuthServer();
  const params: Record<string, unknown> = {
    p_sort: opts.sort,
    p_window: opts.window,
    p_limit: opts.limit ?? 20,
    p_offset: opts.offset ?? 0,
    p_author: opts.author ?? null,
    p_bookmarked: opts.bookmarked ?? false,
  };
  // Only send the viewer-filter params when actually filtering. The default feed
  // then still matches the pre-migration 6-arg community_feed; the Reblogs/Likes
  // pages (which set these) require migration 20260711000003 to be applied.
  if (opts.reblogged) params.p_reblogged = true;
  if (opts.liked) params.p_liked = true;
  const { data, error } = await sb.rpc("community_feed", params);
  if (error) {
    console.warn("community_feed failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

/** Resolve a post by its public_id (the routing key). */
export async function getPostByPublicId(publicId: string): Promise<FeedPost | null> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_post", { p_public: publicId });
  if (error || !data || data.length === 0) return null;
  return mapRow(data[0]);
}

/** Map an internal UUID to its public_id — the sole use is 301-ing legacy
 *  /community/p/{uuid} links to the canonical /community/p/{public_id}. Returns
 *  null for unknown or non-readable (hidden) rows, so those just 404. */
export async function publicIdForUuid(uuid: string): Promise<string | null> {
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from("community_posts")
    .select("public_id")
    .eq("id", uuid)
    .maybeSingle();
  return data?.public_id != null ? String(data.public_id) : null;
}

export async function listReplies(postId: string): Promise<FeedPost[]> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_replies", {
    p_post: postId,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.warn("community_replies failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

/** Batched poll tallies: one round trip for every poll on a page. */
export async function listPollResults(postIds: string[]): Promise<Record<string, PollResult>> {
  if (postIds.length === 0) return {};
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_poll_results_many", { p_posts: postIds });
  if (error) {
    console.warn("community_poll_results_many failed:", error.message);
    return {};
  }
  const out: Record<string, PollResult> = {};
  for (const row of (data ?? []) as {
    post_id: string;
    option_index: number;
    votes: number;
    viewer_choice: boolean;
  }[]) {
    const entry = (out[row.post_id] ??= { counts: {}, viewerChoice: null, total: 0 });
    entry.counts[row.option_index] = row.votes;
    entry.total += row.votes;
    if (row.viewer_choice) entry.viewerChoice = row.option_index;
  }
  return out;
}

/** True when the signed-in viewer may post (verified email, not banned). */
export async function viewerCanPost(): Promise<boolean> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_can_post");
  if (error) return false;
  return Boolean(data);
}

/** The signed-in viewer's community handle, or null. */
export async function viewerHandle(): Promise<string | null> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return data?.username ?? null;
}

export async function listAds(): Promise<AdSlot[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("community_ads")
    .select("slot, image_path, link_url")
    .eq("active", true)
    .order("slot");
  if (error) return [];
  return (data ?? []).map((a) => ({
    slot: a.slot as 1 | 2,
    imagePath: a.image_path,
    linkUrl: a.link_url,
  }));
}
