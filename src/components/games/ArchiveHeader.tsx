import { Flame, Target, Timer, Trophy } from "lucide-react";
import { getMyGameStats, getMyAvgSolveTime } from "@/lib/games/profile-queries";
import type { GameKey } from "@/lib/games/registry";

function fmtMs(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${s}s`;
}

function Tile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-card p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-btn bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-bold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export async function ArchiveHeader({ game }: { game: GameKey }) {
  const [stats, avgMs] = await Promise.all([getMyGameStats(game), getMyAvgSolveTime(game)]);
  const winPct = stats && stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile
        icon={<Flame className="size-5 text-brand" />}
        value={String(stats?.currentStreak ?? 0)}
        label="Day Streak"
      />
      <Tile
        icon={<Target className="size-5" />}
        value={`${winPct}%`}
        label="Win Rate"
      />
      <Tile
        icon={<Timer className="size-5" />}
        value={fmtMs(avgMs)}
        label="Avg Solve Time"
      />
      <Tile
        icon={<Trophy className="size-5" />}
        value={String(stats?.won ?? 0)}
        label="Puzzles Solved"
      />
    </div>
  );
}
