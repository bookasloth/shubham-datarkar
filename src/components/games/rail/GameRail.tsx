import "server-only";

import Link from "next/link";
import { HelpCircle, Gamepad2 } from "lucide-react";
import { GAMES, type GameKey } from "@/lib/games/registry";
import { HELP } from "@/lib/games/help-content";

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

export async function GameRail({ game }: { game: GameKey }) {
  return (
    <div className="space-y-4">
      <GuideCard game={game} />
      <OtherGamesCard game={game} />
    </div>
  );
}
