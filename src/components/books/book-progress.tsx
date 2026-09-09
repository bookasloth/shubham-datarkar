import { cn } from "@/lib/utils";

/** Slim reading-progress bar + "N%" label. Renders nothing when unknown. */
export function BookProgress({
  percentage,
  className,
}: {
  percentage: number | null;
  className?: string;
}) {
  if (percentage == null) return null;
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-background/60">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[0.65rem] font-medium text-muted-foreground">{pct}%</span>
    </div>
  );
}
