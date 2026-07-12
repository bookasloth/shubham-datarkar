export type FeedSort = "new" | "hot" | "top" | "controversial";
export type FeedWindow = "all" | "today" | "week" | "month" | "year";
export type Badge = "grey" | "orange" | "gold";
export type PostType = "text" | "image" | "poll" | "youtube";

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
  reblogOf: string | null;
  createdAt: string;
  viewerVote: -1 | 0 | 1;
  viewerBookmarked: boolean;
  viewerReblogged: boolean;
};

export type AdSlot = { slot: 1 | 2; imagePath: string | null; linkUrl: string | null };

/** Tally for one poll. `counts` is keyed by option index; missing = 0 votes. */
export type PollResult = {
  counts: Record<number, number>;
  viewerChoice: number | null;
  total: number;
};
