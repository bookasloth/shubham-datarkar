import { isToday } from "@/lib/daily";
import { requireGameUser } from "@/lib/games/session";
import { notFound } from "next/navigation";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";

export default async function AlfazyArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isToday(n)) {
    await requireGameUser(`/games/alfazy/${n}`);
  }
  const answer = await wordForPuzzle(n);
  return <AlfazyBoard puzzleNumber={n} isArchive={!isToday(n)} answer={answer} />;
}
