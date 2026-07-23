"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Container, Section } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { BlueprintFrame, CrosshairGrid, GeometricMark } from "@/components/blueprint";

/** App-level error boundary, styled on the blueprint kit to match the 404. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <BlueprintFrame className="px-6 py-20 md:py-28">
          <CrosshairGrid className="opacity-70" />
          <div className="relative text-center">
            <GeometricMark size={104} className="mx-auto" />
            <p className="mt-8 font-display text-6xl font-extrabold tracking-tight md:text-7xl">
              Error
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Something broke on our end</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              An unexpected error occurred. You can try again — if it keeps happening, the issue is
              logged and I&apos;ll look into it.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={reset}>
                <RotateCcw className="size-4" />
                Try again
              </Button>
            </div>
          </div>
        </BlueprintFrame>
      </Container>
    </Section>
  );
}
