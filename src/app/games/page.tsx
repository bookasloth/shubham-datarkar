import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { puzzleNumberFor } from "@/lib/daily";
import { GAMES } from "@/lib/games/registry";
import { getMyStats } from "@/lib/games/profile-queries";
import PuzzleCountdown from "@/components/games/PuzzleCountdown";

export default async function GamesHub() {
  const stats = await getMyStats(); // [] when signed out or no games played yet
  const byGame = new Map(stats.map((s) => [s.game, s]));
  const hasHistory = stats.length > 0;

  const totalPlayed = stats.reduce((n, s) => n + s.total_played, 0);
  const totalWon = stats.reduce((n, s) => n + s.total_won, 0);
  const bestStreak = stats.reduce((n, s) => Math.max(n, s.max_streak), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Daily Games</h1>
        {/* No single puzzle number here any more — each game numbers from its own
            launch day, so the number lives on each card. The reset is shared. */}
        <p className="text-sm text-muted-foreground">
          <PuzzleCountdown />
        </p>
      </div>

      {hasHistory && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Played" value={totalPlayed} />
          <StatTile label="Best streak" value={bestStreak} />
          <StatTile label="Won" value={totalWon} />
        </div>
      )}

      <div className="grid gap-3">
        {GAMES.map((g) => {
          const s = byGame.get(g.key);
          const streak = s?.current_streak ?? 0;
          return (
            <Link
              key={g.slug}
              href={`/games/${g.slug}`}
              data-game={g.slug}
              className="group flex items-center gap-4 rounded-card border border-border bg-card p-5 transition-ui hover:border-brand hover:shadow-sm"
            >
              <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-semibold">
                  {g.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground tabular-nums">
                    #{puzzleNumberFor(g.key)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{g.tag}</div>
              </div>
              {streak > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-btn bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                  aria-label={`${streak}-day streak`}
                >
                  <Flame className="size-3.5 text-brand" aria-hidden="true" />
                  <span className="tabular-nums">{streak}</span>
                </span>
              )}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-ui group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          );
        })}
      </div>

      {!hasHistory && (
        <p className="text-xs text-muted-foreground">
          Play free. Log in later to keep your streak and unlock the archive.
        </p>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-card p-3 text-center">
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
