import type { Metadata } from "next";
import { puzzleNumberFor } from "@/lib/daily";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";
import { getMyGameStats } from "@/lib/games/profile-queries";

export const metadata: Metadata = {
  title: "Alfazy — Daily Word Game",
  description: "Guess the 5-letter word in six tries. A new Alfazy puzzle every day.",
};

export default async function AlfazyToday() {
  const p = puzzleNumberFor("alfazy");
  const [answer, stats] = await Promise.all([wordForPuzzle(p), getMyGameStats("alfazy")]);
  // AlfazyThemeProvider is hoisted to the games layout so the rail gets the CSS vars too.
  return <AlfazyBoard puzzleNumber={p} isArchive={false} answer={answer} stats={stats} />;
}
