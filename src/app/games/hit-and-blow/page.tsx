import type { Metadata } from "next";
import { puzzleNumberFor } from "@/lib/daily";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";

export const metadata: Metadata = {
  title: "Hit and Blow — Daily Code Game",
  description: "Crack the 4-digit code in nine tries. A new Hit and Blow puzzle every day.",
};

export default function HitAndBlowToday() {
  return <HitAndBlowBoard puzzleNumber={puzzleNumberFor()} isArchive={false} />;
}
