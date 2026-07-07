import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton } from "@/components/members/grid-skeleton";

export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <GridSkeleton count={9} />
    </div>
  );
}
