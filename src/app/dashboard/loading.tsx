import { Container, Section } from "@/components/layout/container";
import { BlueprintSkeleton } from "@/components/blueprint";
import { Skeleton } from "@/components/ui/skeleton";

/** Blueprint loading shell for the dashboard: heading, KPI tiles, two panels. */
export default function DashboardLoading() {
  return (
    <Section>
      <Container>
        <BlueprintSkeleton>
          <Skeleton className="h-8 w-40" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-card border border-border p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-24" />
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3 rounded-card border border-border p-6">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            <div className="space-y-3 rounded-card border border-border p-6">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </BlueprintSkeleton>
      </Container>
    </Section>
  );
}
