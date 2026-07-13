import { Skeleton } from "@/components/ui/skeleton";

/**
 * Article-shaped fallback (badge, title, meta, paragraph lines) for
 * members/resources/[slug] — the heaviest members page and the worst fit for the
 * default 6-card grid cascade.
 */
export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-live="polite">
      <div className="border-b border-border pb-6">
        <Skeleton className="h-6 w-24 rounded-btn" />
        <Skeleton className="mt-4 h-8 w-3/4" />
        <Skeleton className="mt-2 h-8 w-1/2" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? "h-3.5 w-2/3" : "h-3.5 w-full"} />
        ))}
      </div>
    </div>
  );
}

/** Panel-shaped fallback (title + stacked cards) for account / requests /
 *  tools/[slug] — pages built from cards or forms, not a grid. */
export function PanelSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-card border border-border p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}
