import type { Stat } from "@/lib/data/types";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function StatGrid({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <Stagger
      className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4", className)}
    >
      {stats.map((s) => (
        <StaggerItem key={s.label} className="bg-card p-6">
          <div className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{s.value}</div>
          <div className="mt-2 text-sm font-medium">{s.label}</div>
          {s.sub && <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>}
        </StaggerItem>
      ))}
    </Stagger>
  );
}
