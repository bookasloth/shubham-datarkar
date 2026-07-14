import type { Metadata } from "next";
import { headers } from "next/headers";
import { getShellUser } from "@/lib/app-shell/user";
import { requestNow } from "@/lib/request-now";
import { AppShell } from "@/components/app-shell/shell";
import AlfazyThemeProvider from "@/components/games/AlfazyThemeProvider";
import { GameRail } from "@/components/games/rail/GameRail";
import { GAMES, type GameKey } from "@/lib/games/registry";

export const metadata: Metadata = {
  title: "Games",
  description: "Daily word and code puzzles — Alfazy, Hit and Blow, Integra.",
};

function activeGame(pathname: string): GameKey | null {
  // /games/{slug}/... — the middleware sets x-pathname so the layout can decide
  // WHETHER a rail exists (the hub has none, and an empty <aside> would still
  // reserve its 320px column). GameRail picks WHICH game itself, client-side from
  // usePathname, so switching games doesn't wait on this server round-trip.
  const slug = pathname.split("/")[2];
  return GAMES.find((g) => g.slug === slug)?.key ?? null;
}

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const [user, hdrs, now] = await Promise.all([getShellUser(), headers(), requestNow()]);
  const path = hdrs.get("x-pathname") ?? "";
  const game = activeGame(path);
  // The Alfazy theme lives on CSS vars set by this provider's wrapper div. It has
  // to sit ABOVE AppShell so the rail's <aside> — a sibling of <main>, not a child —
  // is inside it too; otherwise the Guide card's example tiles resolve
  // var(--alfazy-correct-base) to nothing and render transparent.
  return (
    <AlfazyThemeProvider now={now}>
      <AppShell user={user} rail={game ? <GameRail /> : undefined}>
        <div data-games className="py-8">{children}</div>
      </AppShell>
    </AlfazyThemeProvider>
  );
}
