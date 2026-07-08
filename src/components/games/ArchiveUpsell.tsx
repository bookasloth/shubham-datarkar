import Link from "next/link";
import { Lock } from "lucide-react";

/** Native in-game wall for archive puzzles the viewer can't open yet. No emoji (project rule). */
export function ArchiveUpsell({ game }: { game: "alfazy" | "hit-and-blow" }) {
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-card border border-border bg-card p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-card bg-muted">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 font-display text-xl font-bold">This puzzle is in the Member archive</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Today and yesterday are free. Become a Member to play every past puzzle.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/members/upgrade"
          className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
        >
          Unlock the archive
        </Link>
        <Link
          href={`/games/${game}`}
          className="rounded-btn border border-border px-4 py-2 text-sm transition-ui hover:bg-accent"
        >
          Continue with today&apos;s puzzle
        </Link>
        <Link
          href="/members/upgrade"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          See everything included in Membership
        </Link>
      </div>
    </div>
  );
}
