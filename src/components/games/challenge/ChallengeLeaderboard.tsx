import { getChallengeLeaderboard } from "@/lib/games/challenges/queries";
import { Podium } from "@/components/games/Podium";

/** A single challenge's ranked, finished attempts. Guests show as "Guest". */
export async function ChallengeLeaderboard({ code }: { code: string }) {
  const rows = await getChallengeLeaderboard(code);
  if (rows.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">No one has finished this challenge yet.</p>;
  }

  const podium = rows.slice(0, 3).map((r) => ({
    displayName: r.username ?? "Guest",
    username: r.username ?? "guest",
  }));

  return (
    <div className="space-y-4">
      <Podium entries={podium} />
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Player</th>
              <th className="px-4 py-2 font-medium">Result</th>
              <th className="px-4 py-2 font-medium">Guesses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2">{r.username ?? <span className="text-muted-foreground">Guest</span>}</td>
                <td className="px-4 py-2">{r.status === "won" ? "Cracked" : "Failed"}</td>
                <td className="px-4 py-2">{r.guesses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
