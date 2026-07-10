import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getGameUser } from "@/lib/games/session";
import GamesAuthForm from "@/components/games/GamesAuthForm";

export const metadata = buildMetadata({ title: "Sign in", path: "/games/login", noIndex: true });

export default async function GamesLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next === "/games" || next?.startsWith("/games/") ? next : "/games";

  if (await getGameUser()) redirect(safeNext);

  return <GamesAuthForm next={safeNext} />;
}
