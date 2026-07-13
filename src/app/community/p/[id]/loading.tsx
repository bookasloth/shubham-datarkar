import { Skeleton } from "@/components/ui/skeleton";
import { PostCardSkeleton } from "@/components/community/post-card-skeleton";

/** Detail-shaped fallback: the "Post" header, the post card, and a couple of
 *  reply placeholders. Overrides the feed skeleton from community/loading.tsx. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-16" />
      </div>
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
