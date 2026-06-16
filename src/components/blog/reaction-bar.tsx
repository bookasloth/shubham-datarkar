"use client";

import { useEffect, useState } from "react";
import { Flame, Heart, HelpCircle, Lightbulb, Meh, ThumbsDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { REACTIONS, type ReactionCounts, type ReactionKey } from "@/lib/blog/reactions";
import { react } from "@/lib/blog/reaction-actions";

const ICONS: Record<ReactionKey, LucideIcon> = {
  love: Heart,
  fire: Flame,
  insightful: Lightbulb,
  meh: Meh,
  confused: HelpCircle,
  down: ThumbsDown,
};

/**
 * Reaction bar — six monochrome sentiment reactions, best → worst. One pick
 * per post (localStorage), switchable, toggle-off. Counts stay hidden until
 * the reader interacts, then reveal for all six. Failures are swallowed
 * silently: this is a feel-good vanity widget, it must never nag.
 */
export function ReactionBar({ slug }: { slug: string }) {
  const storageKey = `reaction:${slug}`;
  const [pick, setPick] = useState<ReactionKey | null>(null);
  const [counts, setCounts] = useState<ReactionCounts | null>(null); // null = hidden
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setPick(stored as ReactionKey);
    } catch {
      /* localStorage unavailable — fine, just no restored pick */
    }
  }, [storageKey]);

  async function choose(key: ReactionKey) {
    if (pending) return;
    const prev = pick;
    const next = prev === key ? null : key;

    // Optimistic: reflect the pick immediately.
    setPick(next);
    setPending(true);
    try {
      if (next) localStorage.setItem(storageKey, next);
      else localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }

    const res = await react(slug, next, prev);
    setPending(false);
    if (res.ok) setCounts(next === null ? null : res.counts);
  }

  return (
    <div className="flex flex-col gap-6 border-b border-border py-10 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-sm">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Reactions</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">How was this article?</h2>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {REACTIONS.map((r) => {
          const Icon = ICONS[r.key];
          const active = pick === r.key;
          const n = counts?.[r.key] ?? 0;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => choose(r.key)}
              aria-label={r.label}
              aria-pressed={active}
              title={r.label}
              className={cn(
                "inline-flex flex-col items-center gap-1 rounded-btn px-2.5 py-2 transition-ui select-none",
                "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:-translate-y-px hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {counts && <span className="text-xs tabular-nums leading-none">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
