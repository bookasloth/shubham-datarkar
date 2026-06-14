import { Candy, Coffee, CalendarDays, Users } from "lucide-react";
import { compactNumber } from "@/lib/utils";
import type { SupportStats } from "@/lib/support/queries";

/** Headline supporter metrics. Wraps 2x2 on mobile. */
export function StatsBar({ stats }: { stats: SupportStats }) {
  const cells = [
    { icon: Users, label: "Supporters", value: stats.supporters },
    { icon: Coffee, label: "Coffees received", value: stats.coffees },
    { icon: Candy, label: "Toffees received", value: stats.toffees },
    { icon: CalendarDays, label: "This month", value: stats.thisMonth },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-card border border-border bg-card p-4">
          <c.icon className="size-5 text-muted-foreground" />
          <p className="mt-3 font-display text-2xl font-bold tracking-tight tabular-nums">
            {compactNumber(c.value)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
