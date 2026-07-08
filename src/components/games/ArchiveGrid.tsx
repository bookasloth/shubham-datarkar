import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { isTodayOrYesterday } from "@/lib/daily";
import { cn } from "@/lib/utils";
import type { ArchiveEntry } from "@/lib/games/archive-queries";

/** Locked entries stay visible — people buy what they can see. */
export function ArchiveGrid({
  entries,
  game,
  canViewArchive,
  now,
}: {
  entries: ArchiveEntry[];
  game: "alfazy" | "hit-and-blow";
  canViewArchive: boolean;
  now: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
      {entries.map((e) => {
        const free = isTodayOrYesterday(e.puzzleNumber, now);
        const open = free || canViewArchive;
        const href = `/games/${game}/${e.puzzleNumber}`;
        const label = e.dateISO.slice(5); // MM-DD
        const inner = (
          <>
            <span className="text-xs font-medium">#{e.puzzleNumber}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
            {e.played ? (
              <Check className="size-3.5 text-success" />
            ) : open ? (
              <span className="size-3.5" />
            ) : (
              <Lock className="size-3.5 text-muted-foreground" />
            )}
          </>
        );
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
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
