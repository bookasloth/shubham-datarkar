import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder that mirrors PostCard's geometry — same `border-b px-4 py-3`,
 * `flex gap-3`, 40px avatar and a content column with a name row, two body
 * lines and the 5-icon action row — so swapping in the real card causes no
 * layout shift.
 */
export function PostCardSkeleton() {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-3.5 w-44" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="flex justify-between pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-9" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** N post-card skeletons for feed-shaped routes. */
export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" aria-label="Loading posts">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
