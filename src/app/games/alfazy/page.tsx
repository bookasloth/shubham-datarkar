import { puzzleNumberFor } from "@/lib/daily";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import { GameSeoFooter } from "@/components/games/GameSeoFooter";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";
import { getMyGameStats } from "@/lib/games/profile-queries";
import { buildMetadata } from "@/lib/seo";
import { gameSeo } from "@/lib/games/seo";

export const metadata = buildMetadata({
  title: gameSeo.alfazy.title,
  description: gameSeo.alfazy.description,
  path: "/games/alfazy",
});

export default async function AlfazyToday() {
  const p = puzzleNumberFor("alfazy");
  const [answer, stats] = await Promise.all([wordForPuzzle(p), getMyGameStats("alfazy")]);
  // AlfazyThemeProvider is hoisted to the games layout so the rail gets the CSS vars too.
  return (
    <>
      <AlfazyBoard puzzleNumber={p} isArchive={false} answer={answer} stats={stats} />
      <GameSeoFooter slug="alfazy" />
    </>
  );
}
