"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Lock, Search } from "lucide-react";
import { isTodayOrYesterday } from "@/lib/daily";
import { gameBySlug } from "@/lib/games/registry";
import { cn } from "@/lib/utils";
import type { ArchiveEntry } from "@/lib/games/archive-queries";

type Filter = "all" | "solved" | "unsolved";
const PAGE = 15;

function pill(active: boolean) {
  return cn(
    "rounded-btn px-3 py-1.5 text-sm font-medium transition-ui",
    active
      ? "bg-foreground text-background"
      : "border border-border bg-card text-foreground hover:border-foreground/30",
  );
}

/** Locked entries stay visible — people buy what they can see. */
export function ArchiveGrid({
  entries,
  game,
  canViewArchive,
  now,
}: {
  entries: ArchiveEntry[];
  game: "alfazy" | "hit-and-blow" | "integra";
  canViewArchive: boolean;
  now: number;
}) {
  // `game` is the URL slug ("hit-and-blow"); the daily engine keys off the enum
  // value ("hit_and_blow"), so map through the registry rather than hand-rolling it.
  const gameKey = gameBySlug(game)!.key;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === "solved" && !e.solved) return false;
      if (filter === "unsolved" && e.solved) return false;
      if (q) {
        const num = `#${e.puzzleNumber}`.toLowerCase();
        if (!num.includes(q) && !e.dateISO.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, filter, query]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  function setFilterReset(f: Filter) {
    setFilter(f);
    setVisible(PAGE);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterReset("all")} className={pill(filter === "all")}>
            All Puzzles
          </button>
          <button onClick={() => setFilterReset("solved")} className={pill(filter === "solved")}>
            Solved
          </button>
          <button onClick={() => setFilterReset("unsolved")} className={pill(filter === "unsolved")}>
            Unsolved
          </button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE);
            }}
            placeholder="Search by # or date"
            className="w-full rounded-input border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none transition-ui focus:border-foreground/40"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No puzzles match.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {shown.map((e) => {
            const free = isTodayOrYesterday(gameKey, e.puzzleNumber, now);
            const open = free || canViewArchive;
            const href = `/games/${game}/${e.puzzleNumber}`;
            const label = e.dateISO.slice(5); // MM-DD
            return (
              <Link
                key={e.puzzleNumber}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-card border p-3 transition-ui",
                  open
                    ? "border-border bg-card hover:border-foreground/30"
                    : "border-dashed border-border bg-muted/40 opacity-80 hover:opacity-100",
                  free && "ring-1 ring-brand/40",
                )}
              >
                <span className="text-xs font-medium">#{e.puzzleNumber}</span>
                <span className="text-[11px] text-muted-foreground">{label}</span>
                {e.solved ? (
                  <Flame className="size-3.5 fill-brand text-brand" />
                ) : open ? (
                  <span className="size-3.5" />
                ) : (
                  <Lock className="size-3.5 text-muted-foreground" />
                )}
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-btn border border-border bg-card px-4 py-2 text-sm font-medium transition-ui hover:border-foreground/30"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
