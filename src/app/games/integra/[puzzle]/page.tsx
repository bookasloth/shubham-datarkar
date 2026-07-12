import { buildMetadata } from "@/lib/seo";
import { isToday, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { requireGameUser } from "@/lib/games/session";
import { can } from "@/lib/members/capabilities";
import { notFound } from "next/navigation";
import IntegraBoard from "@/components/games/IntegraBoard";
import { ArchiveUpsell } from "@/components/games/ArchiveUpsell";
import { equationForPuzzle } from "@/lib/games/integra-puzzles";
import { getMyGameStats } from "@/lib/games/profile-queries";

export const metadata = buildMetadata({ title: "Integra", path: "/games/integra", noIndex: true });

export default async function IntegraArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isTodayOrYesterday(n)) {
    // Older than the free window → require sign-in, then the view_archive capability.
    await requireGameUser(`/games/integra/${n}`);
    const { capabilities } = await getMemberContext();
    if (!can(capabilities, "view_archive")) {
      return <ArchiveUpsell game="integra" />;
    }
  }
  const [answer, stats] = await Promise.all([equationForPuzzle(n), getMyGameStats("integra")]);
  return <IntegraBoard puzzleNumber={n} isArchive={!isToday(n)} answer={answer} stats={stats} />;
}
