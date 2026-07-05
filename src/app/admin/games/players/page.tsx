import Link from "next/link";
import { getPlayersAdmin, type PlayerRow } from "@/lib/games/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminGamesPlayersPage() {
  let players: PlayerRow[] | null = null;
  let loadError = false;
  try {
    players = await getPlayersAdmin();
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        <Link href="/admin/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Games
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load players. This is a fetch error, not an empty list.
        </div>
      ) : players && players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Played</th>
                <th className="px-3 py-2">Won</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {players?.map((p) => (
                <tr key={p.id} className="hover:bg-accent">
                  <td className="px-3 py-2">
                    <Link href={`/admin/games/players/${p.id}`} className="font-medium hover:underline">
                      {p.username}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.totalPlayed}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.totalWon}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
