import "server-only";

import Link from "next/link";
import { HelpCircle, BarChart3, Gamepad2, Settings, ArrowRight } from "lucide-react";
import { GAMES, type GameKey } from "@/lib/games/registry";
import { HELP } from "@/lib/games/help-content";
import { getMyGameStats, getMyAvgSolveTime } from "@/lib/games/profile-queries";
import { GameSettingsCard } from "@/components/games/rail/GameSettingsCard";

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

function fmtMs(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${s}s`;
}

function StatRow({ label, value, tone }: { label: string; value: string; tone?: "green" | "purple" | "orange" }) {
  const toneCls =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "purple"
      ? "text-violet-600 dark:text-violet-400"
      : tone === "orange"
      ? "text-brand"
      : "text-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${toneCls}`}>{value}</span>
    </div>
  );
}

async function StatsCard({ game }: { game: GameKey }) {
  const [stats, avgMs] = await Promise.all([
    getMyGameStats(game),
    getMyAvgSolveTime(game),
  ]);

  if (!stats) {
    return (
      <Card icon={<BarChart3 className="size-4" />} title="Stats">
        <p className="text-sm text-muted-foreground">
          Sign in to track your win rate, solve time, and streak.
        </p>
        <Link
          href={`/games/login?next=/games/${GAMES.find((g) => g.key === game)!.slug}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          Sign in <ArrowRight className="size-3" />
        </Link>
      </Card>
    );
  }

  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  return (
    <Card icon={<BarChart3 className="size-4" />} title="Stats">
      <div className="space-y-2">
        <StatRow label="Win percentage" value={`${winPct}%`} tone="green" />
        <StatRow label="Avg solve time" value={avgMs != null ? fmtMs(avgMs) : "—"} tone="purple" />
        <StatRow label="Games played" value={String(stats.played)} />
        <StatRow label="Current streak" value={String(stats.currentStreak)} tone="orange" />
        <StatRow label="Best streak" value={String(stats.maxStreak)} />
      </div>
    </Card>
  );
}

function GuideCard({ game }: { game: GameKey }) {
  return (
    <Card icon={<HelpCircle className="size-4" />} title="Guide">
      {HELP[game].body}
    </Card>
  );
}

function SettingsSection({ game }: { game: GameKey }) {
  return (
    <Card icon={<Settings className="size-4" />} title="Settings">
      <GameSettingsCard game={game} />
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
      <StatsCard game={game} />
      <GuideCard game={game} />
      <SettingsSection game={game} />
      <OtherGamesCard game={game} />
    </div>
  );
}
