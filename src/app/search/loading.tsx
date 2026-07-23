import { Container, Section } from "@/components/layout/container";
import { BlueprintSkeleton } from "@/components/blueprint";
import { Skeleton } from "@/components/ui/skeleton";

/** Blueprint loading shell for search: heading, query bar, result rows. */
export default function SearchLoading() {
  return (
    <Section>
      <Container>
        <BlueprintSkeleton>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-11 w-full max-w-xl" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-card border border-border p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </BlueprintSkeleton>
      </Container>
    </Section>
  );
}
