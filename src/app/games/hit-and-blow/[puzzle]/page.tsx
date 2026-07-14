import { buildMetadata } from "@/lib/seo";
import { isToday, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { requireGameUser } from "@/lib/games/session";
import { can } from "@/lib/members/capabilities";
import { notFound } from "next/navigation";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { ArchiveUpsell } from "@/components/games/ArchiveUpsell";
import { getMyGameStats } from "@/lib/games/profile-queries";

export const metadata = buildMetadata({ title: "Hit and Blow", path: "/games/hit-and-blow", noIndex: true });

export default async function HitAndBlowArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isTodayOrYesterday("hit_and_blow", n)) {
    await requireGameUser(`/games/hit-and-blow/${n}`);
    const { capabilities } = await getMemberContext();
    if (!can(capabilities, "view_archive")) {
      return <ArchiveUpsell game="hit-and-blow" />;
    }
  }
  const stats = await getMyGameStats("hit_and_blow");
  return <HitAndBlowBoard puzzleNumber={n} isArchive={!isToday("hit_and_blow", n)} stats={stats} />;
}
