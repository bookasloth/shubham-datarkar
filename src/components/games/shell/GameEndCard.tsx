"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Lock, BarChart3, CalendarClock, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShareBlock } from "@/components/games/shell/ShareCard";
import type { ShareInput } from "@/lib/games/share";

function LockedStat({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-border bg-card px-2 py-1.5 text-center">
      <div className="font-display text-base font-bold text-muted-foreground/40">—</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function PromoTile({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-2 rounded-card border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-ui hover:border-foreground"
    >
      <span className="text-muted-foreground">{icon}</span>
      {title}
    </Link>
  );
}

/**
 * Post-game upsell shown to logged-out players (Wordle-style end card). Auto-opens
 * once when a game finishes; the board keeps a lightweight inline result behind it.
 * ponytail: logged-out only — signed-in players already save streaks, so they keep
 * the plain inline result and never see this.
 */
export function GameEndCard({
  slug,
  status,
  resultLine,
  share,
}: {
  slug: string;
  status: "won" | "lost";
  resultLine: string;
  share: ShareInput;
}) {
  const [open, setOpen] = useState(true);
  const next = `/games/${slug}`;
  const won = status === "won";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm gap-3 p-5">
        <DialogHeader className="flex-row items-center gap-3 pr-6">
          <span
            className={
              won
                ? "inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-primary text-primary-foreground"
                : "inline-flex size-9 shrink-0 items-center justify-center rounded-card border border-border bg-card text-muted-foreground"
            }
          >
            {won ? <Trophy className="size-4" /> : <RotateCcw className="size-4" />}
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg">{won ? "Nice solve!" : "Good try!"}</DialogTitle>
            <p className="text-xs text-muted-foreground">{resultLine}</p>
          </div>
        </DialogHeader>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" /> Sign up to start your streak
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <LockedStat label="Played" />
            <LockedStat label="Win %" />
            <LockedStat label="Streak" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Button asChild size="sm">
            <Link href={`/register?next=${encodeURIComponent(next)}`}>Create a free account</Link>
          </Button>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-center text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Already registered? Log in
          </Link>
        </div>

        <div className="flex gap-1.5">
          <PromoTile href={`/games/${slug}/leaderboard`} icon={<BarChart3 className="size-3.5" />} title="Leaderboard" />
          <PromoTile href={`/games/${slug}/archive`} icon={<CalendarClock className="size-3.5" />} title="Archive" />
        </div>

        <ShareBlock share={share} />
      </DialogContent>
    </Dialog>
  );
}
