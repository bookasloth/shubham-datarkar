import { cn } from "@/lib/utils";

export type PodiumEntry = {
  displayName: string;
  username: string;
};

// #1 center + tallest. Medals: gold/silver/bronze only — rest of leaderboard stays monochrome.
// Wide + short blocks so long names wrap instead of clipping. Stats live in the table below.
// min-h (not fixed h): the podium keeps its stepped silhouette, but a long
// two-line name grows the bar instead of clipping past line-clamp-2.
const SLOTS = [
  { rank: 2, order: "order-1", h: "min-h-20", bar: "bg-neutral-300 text-neutral-900 dark:bg-neutral-400 dark:text-neutral-900" },
  { rank: 1, order: "order-2", h: "min-h-24", bar: "bg-yellow-400 text-neutral-900 dark:bg-yellow-500" },
  { rank: 3, order: "order-3", h: "min-h-16", bar: "bg-amber-700 text-white dark:bg-amber-800" },
] as const;

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="flex items-end justify-center gap-2 sm:gap-3">
      {SLOTS.map((slot) => {
        const e = entries[slot.rank - 1];
        const width = "w-full max-w-[11rem] flex-1";
        if (!e) return <div key={slot.rank} className={cn(width, slot.order)} />;
        return (
          <div key={slot.rank} className={cn("flex flex-col items-center gap-1.5", width, slot.order)}>
            <div className="w-full max-w-full truncate text-center text-[11px] text-muted-foreground">
              @{e.username}
            </div>
            <div
              className={cn(
                "flex w-full items-center justify-center rounded-t-card px-2 py-2 shadow-xs",
                slot.h,
                slot.bar,
              )}
            >
              <span className="line-clamp-2 text-center text-xs font-semibold leading-tight [overflow-wrap:anywhere] sm:text-sm">
                {e.displayName}
              </span>
            </div>
            <span className="text-lg font-bold leading-none text-muted-foreground">{slot.rank}</span>
          </div>
        );
      })}
    </div>
  );
}
