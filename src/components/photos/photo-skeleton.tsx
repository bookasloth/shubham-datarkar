import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shimmer placeholder matching a photo card's footprint. Reuses the shared
 * monochrome `Skeleton` pulse so loading state reads as one system.
 */
export function PhotoSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        // `break-inside-avoid` keeps a skeleton whole inside masonry columns.
        "mb-4 overflow-hidden rounded-img border border-border bg-card break-inside-avoid",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** A batch of skeletons to fill the grid while the next page loads. */
export function PhotoSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PhotoSkeleton key={i} />
      ))}
    </>
  );
}
