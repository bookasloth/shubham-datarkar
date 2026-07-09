import { Heart, Egg, MessagesSquare, Repeat2, Send, Bookmark, Medal } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";

// ponytail: buttons are inert here (read-only plan). Plan 4 adds handlers +
// optimistic state; keep the markup so the layout is final now.
export function EngagementBar({ post }: { post: FeedPost }) {
  const item =
    "inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent";
  return (
    <div className="mt-2 flex items-center gap-1 text-muted-foreground">
      <span className={cn(item, post.viewerVote === 1 && "text-brand")}>
        <Heart className="size-4" /> {compactNumber(post.upCount)}
      </span>
      <span className={cn(item, post.viewerVote === -1 && "text-foreground")}>
        <Egg className="size-4" /> {compactNumber(post.downCount)}
      </span>
      <span className={item}>
        <MessagesSquare className="size-4" /> {compactNumber(post.replyCount)}
      </span>
      <span className={item}>
        <Repeat2 className="size-4" /> {compactNumber(post.reblogCount)}
      </span>
      <span className={item}>
        <Send className="size-4" />
      </span>
      <span className={cn(item, post.viewerBookmarked && "text-brand")}>
        <Bookmark className="size-4" />
      </span>
      <span className={cn(item, "cursor-not-allowed opacity-40")} title="Awards coming soon">
        <Medal className="size-4" />
      </span>
    </div>
  );
}
