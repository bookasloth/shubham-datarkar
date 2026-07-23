import { Container, Section } from "@/components/layout/container";
import { BlueprintSkeleton } from "@/components/blueprint";
import { Skeleton } from "@/components/ui/skeleton";

/** Blueprint loading shell for /me: centered hero headline, subtitle, CTAs. */
export default function MeLoading() {
  return (
    <Section bleed className="border-b border-border">
      <Container className="py-24 md:py-32">
        <BlueprintSkeleton>
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <Skeleton className="mx-auto h-6 w-32" />
            <Skeleton className="mx-auto h-12 w-3/4" />
            <Skeleton className="mx-auto h-12 w-2/3" />
            <Skeleton className="mx-auto mt-6 h-4 w-full max-w-xl" />
            <Skeleton className="mx-auto h-4 w-5/6 max-w-lg" />
            <div className="flex justify-center gap-3 pt-4">
              <Skeleton className="h-11 w-36" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
        </BlueprintSkeleton>
      </Container>
    </Section>
  );
}
