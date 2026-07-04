import { puzzleNumberFor } from "@/lib/daily";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";

export default function HitAndBlowToday() {
  return <HitAndBlowBoard puzzleNumber={puzzleNumberFor()} isArchive={false} />;
}
