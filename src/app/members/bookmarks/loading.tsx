import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton } from "@/components/members/grid-skeleton";

export default function BookmarksLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <GridSkeleton count={6} />
    </div>
  );
}
