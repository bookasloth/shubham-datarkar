// No "controversial" — the downvote button is gone (#162), so nothing can become
// controversial. The RPC still implements the sort and its filter; both are inert
// while down_count stays 0, and left in place for the day dislikes return.
export type FeedSort = "new" | "hot" | "top";
export type FeedWindow = "all" | "today" | "week" | "month" | "year";
export type Badge = "grey" | "orange" | "gold";
// "quote", "link" and "chat" exist in the DB check constraint as of the
// social-layer migration; the composer that can produce them lands in §7, so
// nothing writes them yet.
export type PostType = "text" | "image" | "poll" | "youtube" | "quote" | "link" | "chat";

/** Optional, type-scoped composer fields. One jsonb column rather than six
 *  nullable ones for values that never appear together. */
export type PostMeta = {
  title?: string;
  /** Attribution line on a quote post. */
  source?: string;
  /** Link post: the URL, plus whatever the server-side unfurl resolved. */
  url?: string;
  link_title?: string;
  link_desc?: string;
  link_image?: string;
  /** Free-text place label. Never coordinates — there is no geolocation call. */
  place?: string;
};

export type PollData = {
  options: { i: number; label: string }[];
  closes_at?: string;
  /** Present only for quizzes; a plain poll omits it. */
  mode?: "quiz";
  /** Option index of the correct answer. Present iff `mode === "quiz"`. */
  correct?: number;
};

export type FeedPost = {
  /** The feed row (a reblog row, or the post itself). Use as the React key —
   *  `id` can repeat when a post and its reblog both surface. */
  rowId: string;
  /** The SOURCE post. Votes, replies and bookmarks all target this. */
  id: string;
  /** Human-friendly permalink key (YYYY + global sequence). Public URLs use
   *  this, never the UUID. Kept as a string — URLs are strings and it sidesteps
   *  any bigint precision worry. */
  publicId: string;
  /** Handle of the reblogger when this row is a reblog, else null. */
  rebloggedBy: string | null;
  userId: string;
  username: string;
  displayName: string | null;
  /** Author's uploaded profile photo, or null → CommunityAvatar seeds an icon. */
  avatarUrl: string | null;
  badge: Badge;
  type: PostType;
  body: string | null;
  images: string[] | null;
  youtubeId: string | null;
  poll: PollData | null;
  /** Resolved server-side from poll.closes_at — never recompute in a render. */
  pollClosed: boolean;
  upCount: number;
  downCount: number;
  score: number;
  replyCount: number;
  reblogCount: number;
  bookmarkCount: number;
  reblogOf: string | null;
  meta: PostMeta | null;
  tags: string[] | null;
  createdAt: string;
  viewerVote: -1 | 0 | 1;
  viewerBookmarked: boolean;
  viewerReblogged: boolean;
  /** The embedded source of a QUOTE reblog — this row has its own body AND
   *  points at another post. Null for a plain post or a bare reblog (a bare
   *  reblog resolves to its source instead, via rebloggedBy). */
  quoted: QuotedPost | null;
};

/** The inset card a quote reblog wraps. Deliberately thinner than FeedPost:
 *  the embed is non-interactive except a click-through, so it carries only what
 *  it renders. `publicId` is the source's permalink key. */
export type QuotedPost = {
  publicId: string;
  username: string;
  body: string | null;
  type: PostType;
  images: string[] | null;
  createdAt: string;
};

export type AdSlot = { slot: 1 | 2; imagePath: string | null; linkUrl: string | null };

/** Tally for one poll. `counts` is keyed by option index; missing = 0 votes. */
export type PollResult = {
  counts: Record<number, number>;
  viewerChoice: number | null;
  total: number;
};
