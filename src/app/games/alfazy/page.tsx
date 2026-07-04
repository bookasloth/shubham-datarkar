import { puzzleNumberFor } from "@/lib/daily";
import AlfazyBoard from "@/components/games/AlfazyBoard";

export default function AlfazyToday() {
  return <AlfazyBoard puzzleNumber={puzzleNumberFor()} isArchive={false} />;
}
