"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type IntegraStats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
};

const triggerCls =
  "rounded-btn border border-border px-2 py-1 text-xs text-muted-foreground transition-ui hover:border-foreground hover:text-foreground";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-card p-3 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function IntegraStatsModal({ stats, authed }: { stats: IntegraStats | null; authed: boolean }) {
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
            <Link href="/games/login?next=/games/integra" className="underline underline-offset-4 hover:text-foreground">
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
