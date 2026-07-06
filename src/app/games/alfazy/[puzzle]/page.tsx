import { isToday } from "@/lib/daily";
import { requireGameUser } from "@/lib/games/session";
import { notFound } from "next/navigation";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import AlfazyThemeProvider from "@/components/games/AlfazyThemeProvider";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";

export default async function AlfazyArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isToday(n)) {
    await requireGameUser(`/games/alfazy/${n}`);
  }
  const now = Date.now();
  const answer = await wordForPuzzle(n);
  return (
    <AlfazyThemeProvider now={now}>
      <AlfazyBoard puzzleNumber={n} isArchive={!isToday(n)} answer={answer} />
    </AlfazyThemeProvider>
  );
}
