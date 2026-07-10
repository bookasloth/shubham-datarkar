import { cn } from "@/lib/utils";
import type { QuotaUsage } from "@/lib/kalamai/quota-server";

function line(used: number, limit: number, noun: string): string {
  if (limit < 0) return `Unlimited ${noun}`;
  const left = Math.max(0, limit - used);
  return `${left} of ${limit} ${noun} left`;
}

/** Compact "X of Y analyses left · A of B articles left" chip for tool-page headers. */
export function QuotaBadge({ usage, className }: { usage: QuotaUsage; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-btn border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="tabular-nums">{line(usage.analyses.used, usage.analyses.limit, "analyses")}</span>
      <span aria-hidden className="text-border">
        &middot;
      </span>
      <span className="tabular-nums">{line(usage.articles.used, usage.articles.limit, "articles")}</span>
    </div>
  );
}
