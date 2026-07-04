import { isToday } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";

export default async function HitAndBlowArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n)) redirect("/games/hit-and-blow");

  if (!isToday(n)) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect(`/games/login?next=/games/hit-and-blow/${n}`);
  }
  return <HitAndBlowBoard puzzleNumber={n} isArchive={!isToday(n)} />;
}
