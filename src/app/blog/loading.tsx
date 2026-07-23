import { Container, Section } from "@/components/layout/container";
import { BlueprintSkeleton } from "@/components/blueprint";
import { Skeleton } from "@/components/ui/skeleton";

/** Blueprint loading shell for the blog index: heading, lead hero, post grid. */
export default function BlogLoading() {
  return (
    <Section>
      <Container>
        <BlueprintSkeleton>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-3 h-4 w-72" />

          <div className="mt-8 grid overflow-hidden rounded-card border border-border md:grid-cols-2">
            <Skeleton className="aspect-[16/10] rounded-none" />
            <div className="space-y-3 p-8">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-card border border-border p-5">
                <Skeleton className="aspect-[16/9] w-full" />
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
