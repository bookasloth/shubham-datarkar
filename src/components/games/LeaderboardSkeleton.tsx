/**
 * Table-shaped fallback for the leaderboard routes. The root /games loading.tsx
 * is a board (tile grid + keyboard) skeleton — wrong shape for a leaderboard —
 * so each leaderboard segment ships this one instead: title, tab strip, podium
 * and a stack of table rows.
 */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-7 w-56 animate-pulse rounded-btn bg-muted" />
        <div className="mx-auto h-4 w-64 animate-pulse rounded-btn bg-muted" />
      </div>

      <div className="mx-auto flex max-w-md gap-1 rounded-input border border-border bg-muted/50 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 flex-1 animate-pulse rounded-btn bg-muted" />
        ))}
      </div>

      <div className="flex items-end justify-center gap-3">
        {["h-20", "h-24", "h-16"].map((h, i) => (
          <div key={i} className={`w-full max-w-[11rem] flex-1 animate-pulse rounded-t-card bg-muted ${h}`} />
        ))}
      </div>

      <div className="space-y-2 rounded-card border border-border p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-btn bg-muted" />
        ))}
      </div>
    </div>
  );
}
