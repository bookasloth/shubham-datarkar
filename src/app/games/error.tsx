"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function GamesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description="That game hit a snag. Try again."
      action={
        <div className="flex justify-center gap-2">
          <Button size="sm" onClick={reset}>Try again</Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/games">Back to games</Link>
          </Button>
        </div>
      }
    />
  );
}
