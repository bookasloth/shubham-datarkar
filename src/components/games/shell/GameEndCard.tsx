"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Lock, BarChart3, CalendarClock, Share2, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function LockedStat({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-3 text-center">
      <div className="font-display text-xl font-bold text-muted-foreground/40">—</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PromoTile({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 transition-ui hover:border-foreground"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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
  onShare,
}: {
  slug: string;
  status: "won" | "lost";
  resultLine: string;
  onShare: () => void;
}) {
  const [open, setOpen] = useState(true);
  const next = `/games/${slug}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 inline-flex size-12 items-center justify-center rounded-card bg-primary text-primary-foreground">
            <Trophy className="size-6" />
          </span>
          <DialogTitle className="text-center text-2xl">{status === "won" ? "Nice solve!" : "Good try!"}</DialogTitle>
          <p className="text-sm text-muted-foreground">{resultLine}</p>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/login?view=signup&next=${encodeURIComponent(next)}`}>Create a free account</Link>
          </Button>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-center text-sm font-medium underline underline-offset-4 hover:text-foreground"
          >
            Already registered? Log in
          </Link>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> Sign up to start your streak
          </div>
          <div className="grid grid-cols-3 gap-2">
            <LockedStat label="Played" />
            <LockedStat label="Win %" />
            <LockedStat label="Streak" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <PromoTile
            href={`/games/${slug}/leaderboard`}
            icon={<BarChart3 className="size-5" />}
            title="See the leaderboard"
            sub="How you rank against other players."
          />
          <PromoTile
            href={`/games/${slug}/archive`}
            icon={<CalendarClock className="size-5" />}
            title="Play past puzzles"
            sub="Every previous puzzle in the archive."
          />
        </div>

        <Button variant="outline" onClick={onShare}>
          <Share2 className="mr-2 size-4" /> Share
        </Button>
      </DialogContent>
    </Dialog>
  );
}
