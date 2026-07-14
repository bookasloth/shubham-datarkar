"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Gamepad2 } from "lucide-react";
import { GAMES, gameBySlug, type GameKey } from "@/lib/games/registry";
import { HELP } from "@/lib/games/help-content";

/**
 * Client component on purpose.
 *
 * Its content is 100% static — guide copy and the game list, no DB and no auth —
 * but it used to be a server component that the games layout picked via the
 * x-pathname header. That made the rail hostage to the layout: every client-side
 * navigation between games refetched the layout from the server, and the rail only
 * appeared once that round-trip landed (~0.7-1.3s in dev, and that was signed out).
 * The board, being a client component, painted immediately — so the rail looked
 * broken by comparison.
 *
 * Deriving the game from usePathname() means the rail re-renders the instant the
 * URL changes, with no server round-trip at all. The layout still decides WHETHER a
 * rail exists (the hub has none, and an empty <aside> would still reserve its 320px
 * column) — it just no longer decides WHICH.
 *
 * Bundle cost is nil: HELP pulls the same game modules the boards already import.
 */
function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
      </header>
      {children}
    </section>
  );
}

// Per-game accent, matching each board's tile palette.
const ACCENT: Record<GameKey, string> = {
  alfazy: "text-emerald-600 dark:text-emerald-400",
  hit_and_blow: "text-sky-600 dark:text-sky-400",
  integra: "text-violet-600 dark:text-violet-400",
};

function GuideCard({ game }: { game: GameKey }) {
  return (
    <Card icon={<HelpCircle className={`size-4 ${ACCENT[game]}`} />} title="How to play">
      {HELP[game].body}
    </Card>
  );
}

function OtherGamesCard({ game }: { game: GameKey }) {
  const others = GAMES.filter((g) => g.key !== game);
  return (
    <Card icon={<Gamepad2 className="size-4" />} title="Other games">
      <ul className="space-y-2">
        {others.map((g) => (
          <li key={g.key}>
            <Link
              href={`/games/${g.slug}`}
              className="group flex items-center justify-between rounded-input px-2 py-1.5 text-sm transition-ui hover:bg-accent"
            >
              <span className="font-medium">{g.name}</span>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">
                {g.tag}
              </span>
            </Link>
          </li>
        ))}
        <li className="rounded-input px-2 py-1.5 text-xs text-muted-foreground">
          More games coming soon.
        </li>
      </ul>
    </Card>
  );
}

export function GameRail() {
  const pathname = usePathname() ?? "";
  // /games/{slug}/... — the same shape the layout used to read off x-pathname.
  const game = gameBySlug(pathname.split("/")[2] ?? "")?.key;
  if (!game) return null;

  return (
    <div className="space-y-4">
      <GuideCard game={game} />
      <OtherGamesCard game={game} />
    </div>
  );
}
