import { redirect } from "next/navigation";
import { getGameUser } from "@/lib/games/session";
import GamesAuthForm from "@/components/games/GamesAuthForm";

export default async function GamesLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/games") ? next : "/games";

  if (await getGameUser()) redirect(safeNext);

  return <GamesAuthForm next={safeNext} />;
}
