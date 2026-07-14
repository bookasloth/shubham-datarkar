import type { Metadata } from "next";
import { headers } from "next/headers";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";
import AlfazyThemeProvider from "@/components/games/AlfazyThemeProvider";
import { GameRail } from "@/components/games/rail/GameRail";
import { GAMES, type GameKey } from "@/lib/games/registry";

export const metadata: Metadata = {
  title: "Games",
  description: "Daily word and code puzzles — Alfazy, Hit and Blow, Integra.",
};

function activeGame(pathname: string): GameKey | null {
  // /games/{slug}/... — the middleware sets x-pathname so a server layout
  // can pick a rail based on the sub-route without splitting the shell.
  const slug = pathname.split("/")[2];
  return GAMES.find((g) => g.slug === slug)?.key ?? null;
}

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const [user, hdrs] = await Promise.all([getShellUser(), headers()]);
  const path = hdrs.get("x-pathname") ?? "";
  const game = activeGame(path);
  // The Alfazy theme lives on CSS vars set by this provider's wrapper div. It has
  // to sit ABOVE AppShell so the rail's <aside> — a sibling of <main>, not a child —
  // is inside it too; otherwise the Guide card's example tiles resolve
  // var(--alfazy-correct-base) to nothing and render transparent.
  return (
    <AlfazyThemeProvider now={Date.now()}>
      <AppShell user={user} rail={game ? <GameRail game={game} /> : undefined}>
        <div data-games className="py-8">{children}</div>
      </AppShell>
    </AlfazyThemeProvider>
  );
}
