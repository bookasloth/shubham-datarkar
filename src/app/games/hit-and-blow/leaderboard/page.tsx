import { buildMetadata } from "@/lib/seo";
import { LeaderboardView, BOARDS, type Board } from "@/components/games/LeaderboardView";

export const metadata = buildMetadata({ title: "Hit and Blow — Leaderboard", path: "/games/hit-and-blow/leaderboard", noIndex: true });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const sp = await searchParams;
  const board: Board = (BOARDS as readonly string[]).includes(sp.board ?? "")
    ? (sp.board as Board)
    : "daily";
  return <LeaderboardView game="hit_and_blow" board={board} />;
}
