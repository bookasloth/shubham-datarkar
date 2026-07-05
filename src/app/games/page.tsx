import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { puzzleNumberFor } from "@/lib/daily";
import { GAMES } from "@/lib/games/registry";
import PuzzleCountdown from "@/components/games/PuzzleCountdown";

export default function GamesHub() {
  const today = puzzleNumberFor();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Daily Games</h1>
        <p className="text-sm text-muted-foreground">
          Puzzle <span className="font-semibold text-foreground">#{today}</span> ·{" "}
          <PuzzleCountdown />
        </p>
      </div>

      <div className="space-y-3">
        {GAMES.map((g) => (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            className="group flex items-center justify-between rounded-card border border-border bg-card p-5 transition-ui hover:border-brand hover:shadow-sm"
          >
            <div>
              <div className="font-display text-lg font-semibold">{g.name}</div>
              <div className="text-sm text-muted-foreground">{g.tag}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-ui group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Play free. Log in later to keep your streak and unlock the archive.
      </p>
    </div>
  );
}
