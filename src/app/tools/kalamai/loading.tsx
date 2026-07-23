import { Container, Section } from "@/components/layout/container";
import { BlueprintSkeleton } from "@/components/blueprint";
import { Skeleton } from "@/components/ui/skeleton";

/** Blueprint loading shell for KalamAI: heading, input panel, output area. */
export default function KalamaiLoading() {
  return (
    <Section>
      <Container>
        <BlueprintSkeleton>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-4 w-80" />
          <div className="mt-8 space-y-4 rounded-card border border-border p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-40" />
          </div>
        </BlueprintSkeleton>
      </Container>
    </Section>
  );
}
