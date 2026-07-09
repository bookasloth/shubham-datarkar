export type FeedSort = "new" | "hot" | "top" | "controversial";
export type FeedWindow = "all" | "today" | "week" | "month" | "year";
export type Badge = "grey" | "orange" | "gold";
export type PostType = "text" | "image" | "poll" | "youtube";

export type PollData = { options: { i: number; label: string }[]; closes_at?: string };

export type FeedPost = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  badge: Badge;
  type: PostType;
  body: string | null;
  images: string[] | null;
  youtubeId: string | null;
  poll: PollData | null;
  upCount: number;
  downCount: number;
  score: number;
  replyCount: number;
  reblogCount: number;
  reblogOf: string | null;
  createdAt: string;
  viewerVote: -1 | 0 | 1;
  viewerBookmarked: boolean;
};

export type AdSlot = { slot: 1 | 2; imagePath: string | null; linkUrl: string | null };
