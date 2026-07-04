import Link from "next/link";
import { puzzleNumberFor } from "@/lib/daily";
import { weekBoundsIST, monthBoundsIST } from "@/lib/games/periods";
import {
  getDailyBoard,
  getPeriodBoard,
  getStreakBoard,
  type GameKey,
} from "@/lib/games/leaderboard-queries";
import { cn } from "@/lib/utils";

const GAMES: { key: GameKey; name: string }[] = [
  { key: "alfazy", name: "Alfazy" },
  { key: "hit_and_blow", name: "Hit and Blow" },
];
const BOARDS = ["daily", "weekly", "monthly", "streak"] as const;
type Board = (typeof BOARDS)[number];

function tab(active: boolean) {
  return cn(
    "rounded-btn px-3 py-1.5 text-sm font-medium transition-ui",
    active
      ? "bg-background text-foreground shadow-xs"
      : "text-muted-foreground hover:text-foreground",
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; board?: string }>;
}) {
  const sp = await searchParams;
  const game: GameKey = sp.game === "hit_and_blow" ? "hit_and_blow" : "alfazy";
  const board: Board = (BOARDS as readonly string[]).includes(sp.board ?? "")
    ? (sp.board as Board)
    : "daily";

  let head: string[] = [];
  let rows: (string | number)[][] = [];

  if (board === "daily") {
    const data = await getDailyBoard(game, puzzleNumberFor());
    head = ["#", "Player", "Guesses", "Time"];
    rows = data.map((r, i) => [i + 1, r.username, r.guesses, r.time_ms != null ? `${Math.round(r.time_ms / 1000)}s` : "—"]);
  } else if (board === "streak") {
    const data = await getStreakBoard(game);
    head = ["#", "Player", "Current", "Best"];
    rows = data.map((r, i) => [i + 1, r.username, r.current_streak, r.max_streak]);
  } else {
    const { start, end } = board === "weekly" ? weekBoundsIST() : monthBoundsIST();
    const data = await getPeriodBoard(game, start, end);
    head = ["#", "Player", "Solved", "Total guesses"];
    rows = data.map((r, i) => [i + 1, r.username, r.solved, r.total_guesses]);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Leaderboard</h1>

      <div className="inline-flex gap-1 rounded-input border border-border bg-muted/50 p-1">
        {GAMES.map((g) => (
          <Link key={g.key} href={`/games/leaderboard?game=${g.key}&board=${board}`} className={tab(game === g.key)}>
            {g.name}
          </Link>
        ))}
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-input border border-border bg-muted/50 p-1">
        {BOARDS.map((b) => (
          <Link key={b} href={`/games/leaderboard?game=${game}&board=${b}`} className={tab(board === b)}>
            {b[0].toUpperCase() + b.slice(1)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No results yet — be the first to play.
        </div>
      ) : (
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
              {rows.map((r, i) => (
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
    </div>
  );
}
