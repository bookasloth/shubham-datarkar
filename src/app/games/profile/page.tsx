import { requireGameUser } from "@/lib/games/session";
import { getMyStats, getMyRecent, getMyUsername } from "@/lib/games/profile-queries";
import UsernameForm from "@/components/games/UsernameForm";

const NAMES: Record<string, string> = { alfazy: "Alfazy", hit_and_blow: "Hit and Blow", integra: "Integra" };

export default async function ProfilePage() {
  await requireGameUser("/games/profile");
  const [stats, recent, username] = await Promise.all([getMyStats(), getMyRecent(), getMyUsername()]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <UsernameForm current={username ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.length === 0 ? (
          <div className="rounded-card border border-border bg-card p-6 text-sm text-muted-foreground sm:col-span-2">
            No games played yet.
          </div>
        ) : (
          stats.map((s) => (
            <div key={s.game} className="rounded-card border border-border bg-card p-5">
              <div className="font-display font-semibold">{NAMES[s.game] ?? s.game}</div>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Current streak</dt><dd className="text-right font-semibold">{s.current_streak}</dd>
                <dt className="text-muted-foreground">Best streak</dt><dd className="text-right font-semibold">{s.max_streak}</dd>
                <dt className="text-muted-foreground">Played</dt><dd className="text-right font-semibold">{s.total_played}</dd>
                <dt className="text-muted-foreground">Won</dt><dd className="text-right font-semibold">{s.total_won}</dd>
                <dt className="text-muted-foreground">Win rate</dt>
                <dd className="text-right font-semibold">{s.total_played ? Math.round((s.total_won / s.total_played) * 100) : 0}%</dd>
              </dl>
            </div>
          ))
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold">Recent games</h2>
          <ul className="mt-2 divide-y divide-border rounded-card border border-border">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{NAMES[r.game] ?? r.game} #{r.puzzle_number}</span>
                <span className={r.status === "won" ? "text-success" : "text-muted-foreground"}>
                  {r.status === "won" ? `Won · ${r.guesses}` : "Lost"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
