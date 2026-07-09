import { LeaderboardView, type Board } from "@/components/games/LeaderboardView";

const BOARDS = ["daily", "weekly", "monthly", "streak"] as const;

export const metadata = { title: "Hit and Blow — Leaderboard" };

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
