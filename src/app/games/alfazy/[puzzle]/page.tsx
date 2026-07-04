import { isToday } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AlfazyBoard from "@/components/games/AlfazyBoard";

export default async function AlfazyArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n)) redirect("/games/alfazy");

  if (!isToday(n)) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect(`/games/login?next=/games/alfazy/${n}`);
  }
  return <AlfazyBoard puzzleNumber={n} isArchive={!isToday(n)} />;
}
