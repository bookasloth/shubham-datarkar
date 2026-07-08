import { isToday, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { requireGameUser } from "@/lib/games/session";
import { can } from "@/lib/members/capabilities";
import { notFound } from "next/navigation";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { ArchiveUpsell } from "@/components/games/ArchiveUpsell";

export default async function HitAndBlowArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isTodayOrYesterday(n)) {
    await requireGameUser(`/games/hit-and-blow/${n}`);
    const { capabilities } = await getMemberContext();
    if (!can(capabilities, "view_archive")) {
      return <ArchiveUpsell game="hit-and-blow" />;
    }
  }
  return <HitAndBlowBoard puzzleNumber={n} isArchive={!isToday(n)} />;
}
