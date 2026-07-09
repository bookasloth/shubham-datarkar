import type { Metadata } from "next";
import { puzzleNumberFor } from "@/lib/daily";
import IntegraBoard from "@/components/games/IntegraBoard";
import { equationForPuzzle } from "@/lib/games/integra-puzzles";
import { getMyIntegraStats } from "@/lib/games/profile-queries";

export const metadata: Metadata = {
  title: "Integra — Daily Math Puzzle",
  description: "Guess the hidden equation in six tries. A new Integra puzzle every day.",
};

export default async function IntegraToday() {
  const p = puzzleNumberFor();
  const [answer, stats] = await Promise.all([equationForPuzzle(p), getMyIntegraStats()]);
  return <IntegraBoard puzzleNumber={p} isArchive={false} answer={answer} stats={stats} />;
}
