import { puzzleNumberFor } from "@/lib/daily";
import IntegraBoard from "@/components/games/IntegraBoard";
import { GameSeoFooter } from "@/components/games/GameSeoFooter";
import { equationForPuzzle } from "@/lib/games/integra-puzzles";
import { getMyGameStats } from "@/lib/games/profile-queries";
import { buildMetadata } from "@/lib/seo";
import { gameSeo } from "@/lib/games/seo";

export const metadata = buildMetadata({
  title: gameSeo.integra.title,
  description: gameSeo.integra.description,
  path: "/games/integra",
});

export default async function IntegraToday() {
  const p = puzzleNumberFor("integra");
  const [answer, stats] = await Promise.all([equationForPuzzle(p), getMyGameStats("integra")]);
  return (
    <>
      <IntegraBoard puzzleNumber={p} isArchive={false} answer={answer} stats={stats} />
      <GameSeoFooter slug="integra" />
    </>
  );
}
