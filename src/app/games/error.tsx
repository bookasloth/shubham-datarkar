"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GamesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-card border border-border bg-card p-8 text-center">
      <h1 className="font-display text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">That game hit a snag. Try again.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button size="sm" onClick={reset}>Try again</Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/games">Back to games</Link>
        </Button>
      </div>
    </div>
  );
}
