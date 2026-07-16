import { buildMetadata } from "@/lib/seo";
import { LeaderboardView, BOARDS, type Board } from "@/components/games/LeaderboardView";

export const metadata = buildMetadata({ title: "Alfazy — Leaderboard", path: "/games/alfazy/leaderboard", noIndex: true });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const sp = await searchParams;
  const board: Board = (BOARDS as readonly string[]).includes(sp.board ?? "")
    ? (sp.board as Board)
    : "daily";
  return <LeaderboardView game="alfazy" board={board} />;
}
