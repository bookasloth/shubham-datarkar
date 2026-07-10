import Link from "next/link";
import { puzzleNumberFor } from "@/lib/daily";
import { getResultsPage } from "@/lib/games/results-queries";
import { resolveAnswers } from "@/lib/games/answer";
import type { GameKey } from "@/lib/games/registry";

const OUTCOMES = ["all", "won", "lost"] as const;

function fmtScore(guesses: number, timeMs: number | null): string {
  const t = timeMs != null ? ` · ${Math.round(timeMs / 1000)}s` : "";
  return `${guesses}${t}`;
}

export async function ResultsView({
  game,
  slug,
  searchParams,
}: {
  game: GameKey;
  slug: string;
  searchParams: { player?: string; outcome?: string; limit?: string };
}) {
  const player = searchParams.player?.trim() || undefined;
  const outcome = (OUTCOMES as readonly string[]).includes(searchParams.outcome ?? "")
    ? (searchParams.outcome as string)
    : "all";
  // ponytail: limit-grow pagination (re-fetch from 0). Fine to a few hundred rows;
  // switch to keyset paging if a game ever has tens of thousands of results.
  const limit = Math.min(Math.max(Number(searchParams.limit) || 50, 50), 200);
  const before = puzzleNumberFor();

  const rows = await getResultsPage({ game, before, outcome, player, limit });
  const nums = [...new Set(rows.map((r) => r.puzzle_number))];
  const answers = await resolveAnswers(game, nums);

  const loadMoreHref = () => {
    const p = new URLSearchParams();
    if (player) p.set("player", player);
    if (outcome !== "all") p.set("outcome", outcome);
    p.set("limit", String(limit + 50));
    return `/games/${slug}/results?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Results</h1>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="player"
          defaultValue={player ?? ""}
          placeholder="Search player"
          className="rounded-input border border-border bg-background px-3 py-1.5 text-sm"
        />
        <select
          name="outcome"
          defaultValue={outcome}
          className="rounded-input border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="all">All</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <button
          type="submit"
          className="rounded-btn border border-border bg-muted px-3 py-1.5 text-sm font-medium transition-ui hover:bg-muted/70"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No results yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {["Date", "Answer", "Player", "Score", "Outcome"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap">{r.puzzle_date}</td>
                    <td className="px-4 py-2 font-mono">{answers.get(r.puzzle_number) ?? "—"}</td>
                    <td className="px-4 py-2">{r.username}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtScore(r.guesses, r.time_ms)}</td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === limit && (
            <div className="text-center">
              <Link
                href={loadMoreHref()}
                className="inline-block rounded-btn border border-border bg-muted px-4 py-2 text-sm font-medium transition-ui hover:bg-muted/70"
              >
                Load more
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
