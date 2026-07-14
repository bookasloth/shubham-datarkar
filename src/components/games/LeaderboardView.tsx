import Link from "next/link";
import { puzzleNumberFor } from "@/lib/daily";
import { weekBoundsIST, monthBoundsIST } from "@/lib/games/periods";
import {
  getDailyBoard,
  getPeriodBoard,
  getStreakBoard,
} from "@/lib/games/leaderboard-queries";
import { GAMES, type GameKey } from "@/lib/games/registry";
import { ALFAZY } from "@/lib/games/alfazy";
import { HIT_AND_BLOW } from "@/lib/games/hit-and-blow";
import { INTEGRA } from "@/lib/games/integra";
import { Podium, type PodiumEntry } from "@/components/games/Podium";
import { BoardSelect } from "@/components/games/BoardSelect";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const BOARDS = ["daily", "weekly", "monthly", "streak"] as const;
export type Board = (typeof BOARDS)[number];

function slugFor(game: GameKey): string {
  return GAMES.find((g) => g.key === game)?.slug ?? "alfazy";
}

function maxGuessesFor(game: GameKey): number {
  return game === "alfazy" ? ALFAZY.maxGuesses : game === "integra" ? INTEGRA.maxGuesses : HIT_AND_BLOW.maxGuesses;
}

function fmtTime(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${s}s`;
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
  const maxGuesses = maxGuessesFor(game);

  let head: string[] = [];
  let rows: (string | number)[][] = [];
  let podium: PodiumEntry[] = [];

  if (board === "daily") {
    const data = await getDailyBoard(game, puzzleNumberFor());
    head = ["#", "Name", "Username", "Time", "Tries"];
    rows = data.map((r, i) => [
      i + 1,
      r.display_name ?? r.username,
      `@${r.username}`,
      fmtTime(r.time_ms),
      `${r.guesses}/${maxGuesses}`,
    ]);
    podium = data.slice(0, 3).map((r) => ({
      displayName: r.display_name ?? r.username,
      username: r.username,
      primary: `${r.guesses}/${maxGuesses} tries`,
      secondary: fmtTime(r.time_ms),
    }));
  } else if (board === "streak") {
    // Re-sort client-side by max_streak — RPC returns current-streak order, but the
    // board now surfaces best-streak only.
    const data = (await getStreakBoard(game)).slice().sort((a, b) => b.max_streak - a.max_streak);
    head = ["#", "Name", "Username", "Best streak"];
    rows = data.map((r, i) => [
      i + 1,
      r.display_name ?? r.username,
      `@${r.username}`,
      r.max_streak,
    ]);
    podium = data.slice(0, 3).map((r) => ({
      displayName: r.display_name ?? r.username,
      username: r.username,
      primary: `best ${r.max_streak}`,
    }));
  } else {
    const { start, end } = board === "weekly" ? weekBoundsIST() : monthBoundsIST();
    const data = await getPeriodBoard(game, start, end);
    head = ["#", "Name", "Username", "Solved", "Total tries"];
    rows = data.map((r, i) => [
      i + 1,
      r.display_name ?? r.username,
      `@${r.username}`,
      r.solved,
      r.total_guesses,
    ]);
    podium = data.slice(0, 3).map((r) => ({
      displayName: r.display_name ?? r.username,
      username: r.username,
      primary: `${r.solved} solved`,
      secondary: `${r.total_guesses} tries`,
    }));
  }

  // Ranks 4+ go in the table; the podium already shows the top 3.
  const tableRows = rows.slice(3);

  return (
    <div className="space-y-6">
      <h1 className="text-center font-display text-2xl font-bold">Leaderboard</h1>

      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex gap-1 rounded-input border border-border bg-muted/50 p-1">
          {GAMES.map((g) => (
            <Link key={g.key} href={`/games/${g.slug}/leaderboard?board=${board}`} className={tab(game === g.key)}>
              {g.name}
            </Link>
          ))}
        </div>
        <BoardSelect slug={slug} board={board} />
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
