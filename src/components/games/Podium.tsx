import { cn } from "@/lib/utils";

export type PodiumEntry = {
  displayName: string;
  username: string;
  primary: string;
  secondary?: string;
};

// #1 center + tallest. Medals: gold/silver/bronze only — rest of leaderboard stays monochrome.
const SLOTS = [
  { rank: 2, order: "order-1", h: "h-28", bar: "bg-neutral-300 text-neutral-900 dark:bg-neutral-400 dark:text-neutral-900" },
  { rank: 1, order: "order-2", h: "h-36", bar: "bg-yellow-400 text-neutral-900 dark:bg-yellow-500" },
  { rank: 3, order: "order-3", h: "h-24", bar: "bg-amber-700 text-white dark:bg-amber-800" },
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
            <div className="text-xs">{e.primary}</div>
            {e.secondary && <div className="text-[11px] text-muted-foreground">{e.secondary}</div>}
            <div className="max-w-full truncate text-[11px] text-muted-foreground">@{e.username}</div>
            <div
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-t-card px-2 py-2 shadow-xs",
                slot.h,
                slot.bar,
              )}
            >
              <span className="text-lg font-bold leading-none opacity-80">{slot.rank}</span>
              <span className="max-w-full truncate text-sm font-semibold leading-tight">
                {e.displayName}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
