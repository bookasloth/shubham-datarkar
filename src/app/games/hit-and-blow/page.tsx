import type { Metadata } from "next";
import { puzzleNumberFor } from "@/lib/daily";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { getMyGameStats } from "@/lib/games/profile-queries";

export const metadata: Metadata = {
  title: "Hit and Blow — Daily Code Game",
  description: "Crack the 4-digit code in nine tries. A new Hit and Blow puzzle every day.",
};

export default async function HitAndBlowToday() {
  const stats = await getMyGameStats("hit_and_blow");
  return <HitAndBlowBoard puzzleNumber={puzzleNumberFor()} isArchive={false} stats={stats} />;
}
