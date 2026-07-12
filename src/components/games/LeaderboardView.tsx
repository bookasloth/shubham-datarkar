import Link from "next/link";
import { puzzleNumberFor } from "@/lib/daily";
import { weekBoundsIST, monthBoundsIST } from "@/lib/games/periods";
import {
  getDailyBoard,
  getPeriodBoard,
  getStreakBoard,
} from "@/lib/games/leaderboard-queries";
import { GAMES, type GameKey } from "@/lib/games/registry";
import { Podium, type PodiumEntry } from "@/components/games/Podium";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const BOARDS = ["daily", "weekly", "monthly", "streak"] as const;
export type Board = (typeof BOARDS)[number];

function slugFor(game: GameKey): string {
  return GAMES.find((g) => g.key === game)?.slug ?? "alfazy";
}

function tab(active: boolean) {
  return cn(
    "rounded-btn px-3 py-1.5 text-sm font-medium transition-ui",
    active
      ? "bg-background text-foreground shadow-xs"
      : "text-muted-foreground hover:text-foreground",
  );
}

export async function LeaderboardView({ game, board }: { game: GameKey; board: Board }) {
  const slug = slugFor(game);

  let head: string[] = [];
  let rows: (string | number)[][] = [];
  let podium: PodiumEntry[] = [];

  if (board === "daily") {
    const data = await getDailyBoard(game, puzzleNumberFor());
    head = ["#", "Player", "Guesses", "Time"];
    rows = data.map((r, i) => [
      i + 1,
      r.username,
      r.guesses,
      r.time_ms != null ? `${Math.round(r.time_ms / 1000)}s` : "—",
    ]);
    podium = data.slice(0, 3).map((r) => ({ username: r.username, stat: `${r.guesses} guesses` }));
  } else if (board === "streak") {
    const data = await getStreakBoard(game);
    head = ["#", "Player", "Current", "Best"];
    rows = data.map((r, i) => [i + 1, r.username, r.current_streak, r.max_streak]);
    podium = data.slice(0, 3).map((r) => ({ username: r.username, stat: `${r.current_streak} streak` }));
  } else {
    const { start, end } = board === "weekly" ? weekBoundsIST() : monthBoundsIST();
    const data = await getPeriodBoard(game, start, end);
    head = ["#", "Player", "Solved", "Total guesses"];
    rows = data.map((r, i) => [i + 1, r.username, r.solved, r.total_guesses]);
    podium = data.slice(0, 3).map((r) => ({ username: r.username, stat: `${r.solved} solved` }));
  }

  // Ranks 4+ go in the table; the podium already shows the top 3.
  const tableRows = rows.slice(3);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Leaderboard</h1>

      <div className="inline-flex gap-1 rounded-input border border-border bg-muted/50 p-1">
        {GAMES.map((g) => (
          <Link key={g.key} href={`/games/${g.slug}/leaderboard?board=${board}`} className={tab(game === g.key)}>
            {g.name}
          </Link>
        ))}
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-input border border-border bg-muted/50 p-1">
        {BOARDS.map((b) => (
          <Link key={b} href={`/games/${slug}/leaderboard?board=${b}`} className={tab(board === b)}>
            {b[0].toUpperCase() + b.slice(1)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No results yet" description="Be the first to play." />
      ) : (
        <>
          <Podium entries={podium} />
          {tableRows.length > 0 && (
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {head.map((h) => (
                      <th key={h} className="px-4 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {r.map((c, j) => (
                        <td key={j} className="px-4 py-2">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
