import Link from "next/link";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { gameByKey } from "@/lib/games/registry";
import { browseChallenges, getMyChallenges } from "@/lib/games/challenges/queries";
import type { ChallengeGame } from "@/lib/games/challenges/types";
import { CreateChallengeForm } from "@/components/games/challenge/CreateChallengeForm";
import { MyChallengeActions } from "@/components/games/challenge/MyChallengeActions";

export async function ChallengeHub({ game }: { game: ChallengeGame }) {
  const cfg = gameByKey(game);
  const slug = cfg?.slug ?? "";
  const ctx = await getMemberContext();
  const canCreate = can(ctx.capabilities, "create_challenge");

  const [mine, publicOnes] = await Promise.all([
    canCreate ? getMyChallenges(game) : Promise.resolve([]),
    browseChallenges(game, 0),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">{cfg?.name} Challenges</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set a secret, share the link, see who cracks it.</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Create a challenge</h2>
        {canCreate ? (
          <CreateChallengeForm game={game} slug={slug} />
        ) : (
          <div className="rounded-card border border-border bg-card p-5 text-sm">
            <p className="font-medium">Creating challenges is a Member feature.</p>
            <p className="mt-1 text-muted-foreground">Anyone can play a challenge — Members can author their own.</p>
            <Link href="/members/upgrade" className="mt-3 inline-block rounded-btn bg-primary px-4 py-2 font-semibold text-primary-foreground transition-ui hover:opacity-90">
              Become a Member
            </Link>
          </div>
        )}
      </section>

      {canCreate && mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight">Your challenges</h2>
          <ul className="space-y-2">
            {mine.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/games/${slug}/challenge/${c.code}`} className="truncate font-medium underline-offset-4 hover:underline">
                    {c.title || `Challenge ${c.code}`}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {c.crack_count} cracked · {c.play_count} played · {c.is_public ? "public" : "private"}
                    {c.status === "closed" && " · closed"}
                  </p>
                </div>
                <MyChallengeActions code={c.code} status={c.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Public challenges</h2>
        {publicOnes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public challenges yet. Be the first.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {publicOnes.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/games/${slug}/challenge/${c.code}`}
                  className="block rounded-card border border-border bg-card px-4 py-3 transition-ui hover:bg-muted"
                >
                  <span className="truncate font-medium">{c.title || `Challenge ${c.code}`}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{c.crackCount} cracked · {c.playCount} played</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
