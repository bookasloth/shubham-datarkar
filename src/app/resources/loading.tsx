import { Container, Section } from "@/components/layout/container";
import { BlueprintSkeleton } from "@/components/blueprint";
import { Skeleton } from "@/components/ui/skeleton";

/** Blueprint loading shell for resources: heading, filter row, card grid. */
export default function ResourcesLoading() {
  return (
    <Section>
      <Container>
        <BlueprintSkeleton>
          <Skeleton className="h-8 w-44" />
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-card border border-border p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </BlueprintSkeleton>
      </Container>
    </Section>
  );
}
