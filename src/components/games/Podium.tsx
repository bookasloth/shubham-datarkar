import { cn } from "@/lib/utils";

export type PodiumEntry = { username: string; stat: string };

// Visual order places #1 in the center, taller. Monochrome — rank is shown by
// height, elevation, and the rank number only. No medal colors.
const SLOTS = [
  { rank: 2, order: "order-1", h: "h-20", ring: "bg-muted" },
  { rank: 1, order: "order-2", h: "h-28", ring: "bg-card" },
  { rank: 3, order: "order-3", h: "h-16", ring: "bg-muted" },
] as const;

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="flex items-end justify-center gap-3">
      {SLOTS.map((slot) => {
        const e = entries[slot.rank - 1];
        if (!e) return <div key={slot.rank} className={cn("w-24", slot.order)} />;
        return (
          <div key={slot.rank} className={cn("flex w-24 flex-col items-center gap-2", slot.order)}>
            <div className="max-w-full truncate text-sm font-medium">{e.username}</div>
            <div className="text-xs text-muted-foreground">{e.stat}</div>
            <div
              className={cn(
                "flex w-full items-start justify-center rounded-t-card border border-border pt-2 text-lg font-bold shadow-xs",
                slot.h,
                slot.ring,
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
