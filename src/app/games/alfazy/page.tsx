import type { Metadata } from "next";
import { puzzleNumberFor } from "@/lib/daily";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import AlfazyThemeProvider from "@/components/games/AlfazyThemeProvider";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";

export const metadata: Metadata = {
  title: "Alfazy — Daily Word Game",
  description: "Guess the 5-letter word in six tries. A new Alfazy puzzle every day.",
};

export default async function AlfazyToday() {
  const now = Date.now();
  const p = puzzleNumberFor(now);
  const answer = await wordForPuzzle(p);
  return (
    <AlfazyThemeProvider now={now}>
      <AlfazyBoard puzzleNumber={p} isArchive={false} answer={answer} />
    </AlfazyThemeProvider>
  );
}
