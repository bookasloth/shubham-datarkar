import { Skeleton } from "@/components/ui/skeleton";
import { FeedSkeleton } from "@/components/community/post-card-skeleton";

/**
 * Feed fallback. Because a segment's loading.tsx wraps its page AND all children
 * without their own loading.tsx, this one covers the feed plus every
 * feed-shaped child (bookmarks / likes / reblogs / me). p/[id] overrides it with
 * a detail-shaped skeleton.
 */
export default function Loading() {
  return (
    <div>
      {/* Approximates the SortMenu bar (feed) / <h1> header (list pages). */}
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-28" />
      </div>
      <FeedSkeleton count={6} />
    </div>
  );
}
