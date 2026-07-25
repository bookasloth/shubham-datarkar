import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { AdSlot, Badge, FeedPost, FeedSort, FeedWindow, PollResult } from "./types";

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
    avatarUrl: (r.avatar_url as string | null) ?? null,
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
    // Both default rather than assert: the dormant community_post(uuid) shim
    // doesn't return them, and neither does a DB that hasn't run the social-layer
    // migration yet.
    meta: (r.meta as FeedPost["meta"]) ?? null,
    tags: (r.tags as string[]) ?? null,
    // Build-in-public spine: null until the spine migration + a Thread:/Version:
    // line tag the note. Dormant shim RPCs that don't return them → null.
    thread: (r.thread as string) ?? null,
    version: (r.version as string) ?? null,
    viewerVote: ((r.viewer_vote as number) ?? 0) as -1 | 0 | 1,
    viewerBookmarked: Boolean(r.viewer_bookmarked),
    viewerReblogged: Boolean(r.viewer_reblogged),
    // Only community_replies returns depth; feed rows leave it undefined.
    depth: r.depth != null ? (r.depth as number) : undefined,
    // Present only for a quote: the RPC populates quoted_* when this row is a
    // reblog that carries its own body. quoted_id is the SOURCE's public_id.
    quoted:
      r.quoted_id != null
        ? {
            publicId: String(r.quoted_id),
            username: r.quoted_username as string,
            body: (r.quoted_body as string) ?? null,
            type: r.quoted_type as FeedPost["type"],
            images: (r.quoted_images as string[]) ?? null,
            createdAt: r.quoted_created_at as string,
          }
        : null,
  };
}

/** Posts pulled for the logged-out preview to draw its random sample from. */
const RANDOM_POOL = 300;

/**
 * A random handful of posts — what a logged-out visitor sees instead of the feed.
 * Fresh on every request, so the preview is never the same three posts twice.
 *
 * ponytail: samples the newest RANDOM_POOL rows in JS rather than `order by
 * random()`, which would mean recreating community_feed. The pool is ~1.5x the
 * current post count, so today it IS the whole table. If the feed outgrows it
 * the sample silently narrows to the newest 300 — nothing breaks, it just stops
 * reaching the archive. Add a `random` sort to the RPC when that day comes.
 */
export async function listRandomFeed(
  n: number,
  opts: { author?: string } = {},
): Promise<FeedPost[]> {
  const pool = await listFeed({
    sort: "new",
    window: "all",
    limit: RANDOM_POOL,
    author: opts.author,
  });
  // Fisher-Yates over a copy — partial, since only the first n are read.
  const out = [...pool];
  const take = Math.min(n, out.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (out.length - i));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, take);
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
  seed?: number;
  following?: boolean;
  tag?: string;
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
  // Same rule for p_seed: PostgREST resolves an RPC by exact key set, so a key
  // the deployed function doesn't have 404s the whole call. Only 'hot' reads it.
  if (opts.sort === "hot" && opts.seed) params.p_seed = opts.seed;
  if (opts.following) params.p_following = true;
  if (opts.tag) params.p_tag = opts.tag;
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

/** Look up a public profile by handle — the mention/profile-page resolver.
 *  `profiles` is `select using (true)` (usernames are public), so this needs no
 *  RPC. Returns null for an unknown handle, which is what 404s a bad mention
 *  instead of rendering an empty feed for a user who doesn't exist. */
export async function getProfileByUsername(
  username: string,
): Promise<{
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  coverUrl: string | null;
  createdAt: string;
  bio: string | null;
  badge: Badge;
} | null> {
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, headline, cover_url, created_at, bio")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  // Same badge the feed shows next to this handle — gold founder, orange
  // supporter, grey verified. Falls back to grey if the RPC is unreachable,
  // which under-claims rather than minting a badge nobody earned.
  const { data: badge } = await sb.rpc("community_badge", { p_user: data.id });
  return {
    id: data.id as string,
    username: data.username as string,
    displayName: (data.display_name as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    headline: (data.headline as string) ?? null,
    coverUrl: (data.cover_url as string) ?? null,
    createdAt: data.created_at as string,
    bio: (data.bio as string) ?? null,
    badge: ((badge as Badge) ?? "grey") satisfies Badge,
  };
}

/** How many posts an author actually has — a HEAD count, no rows shipped.
 *  Mirrors what the author feed shows: root posts (replies live under their
 *  parent, and a reblog row has parent_id null so it counts), minus moderated
 *  ones, which community_feed hides from everyone. */
export async function countAuthorPosts(userId: string): Promise<number> {
  const sb = await supabaseAuthServer();
  const { count } = await sb
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("parent_id", null)
    .eq("hidden", false)
    .eq("demoted", false);
  return count ?? 0;
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

export type DraftPost = {
  id: string;
  publicId: string;
  type: string;
  body: string | null;
  /** null = draft; ISO in the future = scheduled. */
  publishAt: string | null;
  createdAt: string;
};

/** The viewer's own unpublished posts — drafts (publish_at null) and scheduled
 *  (publish_at in the future). The feed RPC filters both out, so this reads the
 *  table directly; RLS restricts it to the caller's rows either way. */
export async function listOwnUnpublished(): Promise<DraftPost[]> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();
  const { data } = await sb
    .from("community_posts")
    .select("id, public_id, type, body, publish_at, created_at")
    .eq("user_id", user.id)
    .is("parent_id", null)
    .is("reblog_of", null)
    .or(`publish_at.is.null,publish_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    publicId: String(r.public_id),
    type: r.type as string,
    body: (r.body as string) ?? null,
    publishAt: (r.publish_at as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

// ---------------------------------------------------------------------------
// Follows and mutes
// ---------------------------------------------------------------------------

export type SocialCounts = {
  followers: number;
  following: number;
  /** Whether the VIEWER follows this profile. Null when signed out. */
  viewerFollows: boolean | null;
  viewerMutes: boolean;
};

/** Follower/following counts for a profile, plus the viewer's relationship to
 *  it. Counts are HEAD queries — no rows cross the wire for a number. */
export async function getSocialCounts(userId: string): Promise<SocialCounts> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const [followers, following, follow, mute] = await Promise.all([
    sb.from("community_follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    sb.from("community_follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
    user
      ? sb.from("community_follows").select("followee_id").eq("follower_id", user.id).eq("followee_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? sb.from("community_mutes").select("muted_id").eq("muter_id", user.id).eq("muted_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    viewerFollows: user ? Boolean(follow.data) : null,
    viewerMutes: Boolean(mute.data),
  };
}

export type MiniProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  badge: Badge;
};

function mapMini(r: Record<string, unknown>): MiniProfile {
  return {
    id: r.id as string,
    username: r.username as string,
    displayName: (r.display_name as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    badge: ((r.badge as Badge) ?? "grey") satisfies Badge,
  };
}

/** One page of a profile's followers or followees.
 *
 *  Two queries rather than a join: PostgREST can't join community_follows to
 *  profiles without a declared FK relationship name, and the id list is at most
 *  `limit` long, so the second query is a bounded `.in()`. */
async function listFollowSide(
  userId: string,
  side: "followers" | "following",
  limit: number,
  offset: number,
): Promise<MiniProfile[]> {
  const sb = await supabaseAuthServer();
  const [matchCol, idCol] =
    side === "followers" ? ["followee_id", "follower_id"] : ["follower_id", "followee_id"];

  const { data: rows } = await sb
    .from("community_follows")
    .select(idCol)
    .eq(matchCol, userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  const ids = ((rows ?? []) as unknown as Record<string, unknown>[]).map((r) => r[idCol] as string);
  if (ids.length === 0) return [];

  const { data: people } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids)
    .eq("banned", false);
  // Preserve the follow order — .in() returns whatever order it likes.
  const byId = new Map(((people ?? []) as Record<string, unknown>[]).map((p) => [p.id as string, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Record<string, unknown> => Boolean(p))
    .map(mapMini);
}

export const listFollowers = (userId: string, limit = 50, offset = 0) =>
  listFollowSide(userId, "followers", limit, offset);
export const listFollowing = (userId: string, limit = 50, offset = 0) =>
  listFollowSide(userId, "following", limit, offset);

/** Members the viewer has muted — their own list, readable only by them (the
 *  mutes RLS policy is self-only). */
export async function listMutedProfiles(): Promise<MiniProfile[]> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data: rows } = await sb
    .from("community_mutes")
    .select("muted_id")
    .eq("muter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (rows ?? []).map((r) => r.muted_id as string);
  if (ids.length === 0) return [];

  const { data: people } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  return ((people ?? []) as Record<string, unknown>[]).map(mapMini);
}

/** Handles to suggest when the Following feed is empty: the most-followed
 *  members, minus yourself and anyone you already follow.
 *
 *  ponytail: most-followed is the whole ranking. No affinity, no ML — with a
 *  few hundred members "who does everyone else read" is the honest answer, and
 *  it needs one grouped read instead of a recommender. */
export async function listSuggestedProfiles(n = 3): Promise<MiniProfile[]> {
  const sb = await supabaseAuthServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const [{ data: edges }, { data: mine }] = await Promise.all([
    sb.from("community_follows").select("followee_id").limit(2000),
    sb.from("community_follows").select("followee_id").eq("follower_id", user.id),
  ]);

  const skip = new Set([user.id, ...(mine ?? []).map((r) => r.followee_id as string)]);
  const tally = new Map<string, number>();
  for (const e of edges ?? []) {
    const id = e.followee_id as string;
    if (skip.has(id)) continue;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }

  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
  // Nobody follows anybody yet — fall back to the newest handles so the empty
  // state still has something to point at.
  if (ranked.length === 0) {
    const { data: fresh } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("banned", false)
      .not("username", "is", null)
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(n);
    return ((fresh ?? []) as Record<string, unknown>[]).map(mapMini);
  }

  const { data: people } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ranked)
    .eq("banned", false);
  return ((people ?? []) as Record<string, unknown>[]).map(mapMini);
}

/** Image URLs the author has posted, newest first, for the Media tab. Reads the
 *  same `images` text[] the feed shows. Excludes replies (parent_id) so the grid
 *  mirrors the profile's post list; moderated rows are dropped by the not-null
 *  guard below plus the feed's own moderation (best-effort — the Media grid is
 *  cosmetic, not an access-control surface). */
export async function listAuthorMedia(
  userId: string,
  limit = 24,
): Promise<{ url: string; publicId: string }[]> {
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from("community_posts")
    .select("public_id, images, created_at")
    .eq("user_id", userId)
    .is("parent_id", null)
    .not("images", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  const out: { url: string; publicId: string }[] = [];
  for (const row of data ?? []) {
    const imgs = (row.images as string[]) ?? [];
    for (const url of imgs) out.push({ url, publicId: String(row.public_id) });
  }
  return out.slice(0, limit);
}
