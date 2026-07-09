import {
  getGameStats,
  getDailyBoard,
  getStreakBoard,
  type GameStat,
  type BoardRow,
  type StreakRow,
} from "@/lib/games/admin-queries";

export const dynamic = "force-dynamic";

type GamePanel = { stat: GameStat; daily: BoardRow[]; streaks: StreakRow[] };

export default async function AdminGamesPage() {
  let panels: GamePanel[] | null = null;
  let loadError = false;
  try {
    const stats = await getGameStats();
    panels = await Promise.all(
      stats.map(async (stat): Promise<GamePanel> => {
        const [daily, streaks] = await Promise.all([
          getDailyBoard(stat.key, stat.todayPuzzle),
          getStreakBoard(stat.key),
        ]);
        return { stat, daily, streaks };
      }),
    );
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Games</h1>
        <div className="flex items-center gap-2">
          <a
            href="/admin/games/players"
            className="rounded-btn border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Players
          </a>
          <a
            href="/admin/games/words"
            className="rounded-btn border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Words
          </a>
          <a
            href="/admin/games/integra-equations"
            className="rounded-btn border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Equations
          </a>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load game data. This is a fetch error, not empty stats.
        </div>
      ) : (
        panels?.map(({ stat, daily, streaks }) => (
          <section key={stat.key} className="space-y-4">
            <h2 className="font-display text-lg font-semibold">{stat.name}</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Players" value={stat.players} />
              <Stat label="Plays" value={stat.plays} />
              <Stat label="Wins" value={stat.wins} />
              <Stat label="Today" value={`#${stat.todayPuzzle}`} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <BoardCard title={`Today's board (#${stat.todayPuzzle})`}>
                {daily.length === 0 ? (
                  <Empty>No winners yet today.</Empty>
                ) : (
                  <ol className="divide-y divide-border text-sm">
                    {daily.map((r, i) => (
                      <li key={`${r.username}-${i}`} className="flex justify-between py-1.5">
                        <span className="truncate">{i + 1}. {r.username}</span>
                        <span className="text-muted-foreground">
                          {r.guesses} guess{r.guesses === 1 ? "" : "es"}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </BoardCard>

              <BoardCard title="Top streaks">
                {streaks.length === 0 ? (
                  <Empty>No streaks yet.</Empty>
                ) : (
                  <ol className="divide-y divide-border text-sm">
                    {streaks.map((r, i) => (
                      <li key={`${r.username}-${i}`} className="flex justify-between py-1.5">
                        <span className="truncate">{i + 1}. {r.username}</span>
                        <span className="text-muted-foreground">
                          {r.currentStreak} (max {r.maxStreak})
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </BoardCard>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function BoardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="mb-2 text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
