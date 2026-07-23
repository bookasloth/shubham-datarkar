import { puzzleNumberFor } from "@/lib/daily";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { GameSeoFooter } from "@/components/games/GameSeoFooter";
import { getMyGameStats } from "@/lib/games/profile-queries";
import { buildMetadata } from "@/lib/seo";
import { gameSeo } from "@/lib/games/seo";

export const metadata = buildMetadata({
  title: gameSeo["hit-and-blow"].title,
  description: gameSeo["hit-and-blow"].description,
  path: "/games/hit-and-blow",
});

export default async function HitAndBlowToday() {
  const stats = await getMyGameStats("hit_and_blow");
  return (
    <>
      <HitAndBlowBoard puzzleNumber={puzzleNumberFor("hit_and_blow")} isArchive={false} stats={stats} />
      <GameSeoFooter slug="hit-and-blow" />
    </>
  );
}
