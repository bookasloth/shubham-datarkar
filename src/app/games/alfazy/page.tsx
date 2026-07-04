import type { Metadata } from "next";
import { puzzleNumberFor } from "@/lib/daily";
import AlfazyBoard from "@/components/games/AlfazyBoard";

export const metadata: Metadata = {
  title: "Alfazy — Daily Word Game",
  description: "Guess the 5-letter word in six tries. A new Alfazy puzzle every day.",
};

export default function AlfazyToday() {
  return <AlfazyBoard puzzleNumber={puzzleNumberFor()} isArchive={false} />;
}
