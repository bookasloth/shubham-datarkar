import { buildMetadata } from "@/lib/seo";
import { isToday, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { requireGameUser } from "@/lib/games/session";
import { can } from "@/lib/members/capabilities";
import { notFound } from "next/navigation";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import AlfazyThemeProvider from "@/components/games/AlfazyThemeProvider";
import { ArchiveUpsell } from "@/components/games/ArchiveUpsell";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";

export const metadata = buildMetadata({ title: "Alfazy", path: "/games/alfazy", noIndex: true });

export default async function AlfazyArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isTodayOrYesterday(n)) {
    // Older than the free window → require sign-in, then the view_archive capability.
    await requireGameUser(`/games/alfazy/${n}`);
    const { capabilities } = await getMemberContext();
    if (!can(capabilities, "view_archive")) {
      return <ArchiveUpsell game="alfazy" />;
    }
  }
  const now = Date.now();
  const answer = await wordForPuzzle(n);
  return (
    <AlfazyThemeProvider now={now}>
      <AlfazyBoard puzzleNumber={n} isArchive={!isToday(n)} answer={answer} />
    </AlfazyThemeProvider>
  );
}
