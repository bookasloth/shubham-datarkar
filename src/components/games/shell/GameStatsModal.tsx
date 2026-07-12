"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { triggerCls } from "@/components/games/modal-trigger";

export type GameStats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-card p-3 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/** Shared stats modal for every game. `loginNext` is the return path after login. */
export function GameStatsModal({
  stats,
  authed,
  loginNext,
}: {
  stats: GameStats | null;
  authed: boolean;
  loginNext: string;
}) {
  const winRate = stats && stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  return (
    <Dialog>
      <DialogTrigger className={triggerCls}>Stats</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your statistics</DialogTitle>
        </DialogHeader>

        {!authed ? (
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/login?next=${encodeURIComponent(loginNext)}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Log in
            </Link>{" "}
            to track your stats and streaks across days.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Played" value={stats?.played ?? 0} />
            <Stat label="Win %" value={`${winRate}%`} />
            <Stat label="Streak" value={stats?.currentStreak ?? 0} />
            <Stat label="Best" value={stats?.maxStreak ?? 0} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
