import { Candy, Coffee, TrendingUp, Users } from "lucide-react";
import { compactNumber } from "@/lib/utils";
import { supportStats } from "@/lib/data/support-content";

const CELLS = [
  { icon: Users, label: "Supporters", value: supportStats.supporters, prefix: "" },
  { icon: Coffee, label: "Coffees received", value: supportStats.coffees, prefix: "" },
  { icon: Candy, label: "Toffees received", value: supportStats.toffees, prefix: "" },
  { icon: TrendingUp, label: "Top this month", value: supportStats.topThisMonth, prefix: "#" },
];

/** Headline supporter metrics. Wraps 2x2 on mobile. */
export function StatsBar() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CELLS.map((c) => (
        <div key={c.label} className="rounded-card border border-border bg-card p-4">
          <c.icon className="size-5 text-muted-foreground" />
          <p className="mt-3 font-display text-2xl font-bold tracking-tight tabular-nums">
            {c.prefix}
            {compactNumber(c.value)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
