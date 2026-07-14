import { cn } from "@/lib/utils";

export type PodiumEntry = {
  displayName: string;
  username: string;
  primary: string;
  secondary?: string;
};

// #1 center + tallest. Medals: gold/silver/bronze only — rest of leaderboard stays monochrome.
const SLOTS = [
  { rank: 2, order: "order-1", h: "h-20", bar: "bg-neutral-300 text-neutral-900 dark:bg-neutral-400 dark:text-neutral-900" },
  { rank: 1, order: "order-2", h: "h-28", bar: "bg-yellow-400 text-neutral-900 dark:bg-yellow-500" },
  { rank: 3, order: "order-3", h: "h-16", bar: "bg-amber-700 text-white dark:bg-amber-800" },
] as const;

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="flex items-end justify-center gap-3">
      {SLOTS.map((slot) => {
        const e = entries[slot.rank - 1];
        if (!e) return <div key={slot.rank} className={cn("w-28", slot.order)} />;
        return (
          <div key={slot.rank} className={cn("flex w-28 flex-col items-center gap-1.5", slot.order)}>
            <div className="max-w-full truncate text-sm font-semibold">{e.displayName}</div>
            <div className="max-w-full truncate text-[11px] text-muted-foreground">@{e.username}</div>
            <div className="text-xs">{e.primary}</div>
            {e.secondary && <div className="text-[11px] text-muted-foreground">{e.secondary}</div>}
            <div
              className={cn(
                "flex w-full items-start justify-center rounded-t-card pt-2 text-lg font-bold shadow-xs",
                slot.h,
                slot.bar,
              )}
            >
              {slot.rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}
