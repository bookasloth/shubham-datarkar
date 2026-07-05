import { isToday } from "@/lib/daily";
import { requireGameUser } from "@/lib/games/session";
import { notFound } from "next/navigation";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";

export default async function HitAndBlowArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isToday(n)) {
    await requireGameUser(`/games/hit-and-blow/${n}`);
  }
  return <HitAndBlowBoard puzzleNumber={n} isArchive={!isToday(n)} />;
}
