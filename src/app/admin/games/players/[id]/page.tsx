import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetailAdmin, getPlayersAdmin } from "@/lib/games/admin-queries";
import { deleteResult, resetStreak, renameUser } from "@/lib/games/admin-actions";
import { GAMES } from "@/lib/games/registry";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminGamesPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const players = await getPlayersAdmin();
  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const { results, streaks } = await getPlayerDetailAdmin(id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{player.username}</h1>
        <Link href="/admin/games/players" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Players
        </Link>
      </div>

      {/* Rename */}
      <form action={renameUser.bind(null, id)} className="flex items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Rename</span>
          <input
            name="username"
            defaultValue={player.username}
            className="rounded-btn border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <Button size="sm" type="submit">Save</Button>
      </form>

      {/* Streaks + reset */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Streaks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => {
            const s = streaks.find((x) => x.game === g.key);
            return (
              <div key={g.key} className="rounded-card border border-border p-3">
                <div className="mb-1 text-sm font-medium">{g.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current {s?.currentStreak ?? 0} · Max {s?.maxStreak ?? 0} · Won {s?.totalWon ?? 0}/{s?.totalPlayed ?? 0}
                </div>
                <form action={resetStreak.bind(null, id, g.key)} className="mt-2">
                  <Button size="sm" variant="outline" type="submit">Reset streak</Button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {/* Results + delete */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Results</h2>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Game</th>
                  <th className="px-3 py-2">Puzzle</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Guesses</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.game}</td>
                    <td className="px-3 py-2 text-muted-foreground">#{r.puzzleNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.guesses}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteResult.bind(null, r.id)}>
                        <Button size="sm" variant="outline" type="submit">Delete</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
