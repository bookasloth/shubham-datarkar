import { site } from "@/lib/site";
import { getGameUser } from "@/lib/games/session";
import { readGuestKey } from "@/lib/games/challenges/guest";
import { getChallengeMeta, getMyAttempt } from "@/lib/games/challenges/queries";
import { gameByKey } from "@/lib/games/registry";
import { GameHeader } from "@/components/games/shell/GameHeader";
import { ChallengeTileBoard } from "@/components/games/challenge/ChallengeTileBoard";
import { ChallengeCodeBoard } from "@/components/games/challenge/ChallengeCodeBoard";
import { ChallengeLeaderboard } from "@/components/games/challenge/ChallengeLeaderboard";
import { ChallengeShare } from "@/components/games/challenge/ChallengeShare";

/** Play one challenge by code. Server-scored board + this challenge's board. */
export async function ChallengePlay({ code }: { code: string }) {
  const meta = await getChallengeMeta(code);
  if (!meta) {
    return <p className="text-center text-muted-foreground">This challenge doesn’t exist.</p>;
  }

  const cfg = gameByKey(meta.game);
  const slug = cfg?.slug ?? "";
  const expired = new Date(meta.expiresAt) < new Date();
  const playable = meta.status === "open" && !expired;

  const user = await getGameUser();
  const guestKey = user ? null : await readGuestKey();
  const attempt = await getMyAttempt(code, user?.id ?? null, guestKey);
  const shareUrl = `${site.url}/games/${slug}/challenge/${code}`;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6">
      <GameHeader slug={slug} title={meta.title || `${cfg?.name ?? "Challenge"} challenge`} />

      {!playable ? (
        <p className="text-center text-sm text-muted-foreground">
          This challenge is {expired ? "expired" : "closed"} — but the leaderboard stands.
        </p>
      ) : meta.game === "hit_and_blow" ? (
        <ChallengeCodeBoard code={code} initial={attempt} />
      ) : (
        <ChallengeTileBoard code={code} game={meta.game} initial={attempt} />
      )}

      {!user && (
        <p className="text-center text-xs text-muted-foreground">
          Playing as a guest — <a className="underline" href={`/login?next=/games/${slug}/challenge/${code}`}>sign in</a>{" "}
          to save your result to the leaderboard.
        </p>
      )}

      <ChallengeShare url={shareUrl} />

      <section className="w-full space-y-3">
        <h2 className="text-center font-display text-lg font-bold tracking-tight">Leaderboard</h2>
        <ChallengeLeaderboard code={code} />
      </section>
    </div>
  );
}
