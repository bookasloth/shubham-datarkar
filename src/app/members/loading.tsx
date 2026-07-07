import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton } from "@/components/members/grid-skeleton";

export default function MembersLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <GridSkeleton count={6} />
    </div>
  );
}
