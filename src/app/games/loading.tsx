/**
 * Root /games fallback. The three game boards (alfazy / integra / hit-and-blow
 * [puzzle] routes) block on requireGameUser + stats + answer with nothing on
 * screen; this board-shaped skeleton — title, tile grid, keyboard strip — fills
 * the max-w-md games column for every child that lacks its own loading.tsx
 * (leaderboard/ and profile/ keep theirs).
 */
export default function GamesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-7 w-40 animate-pulse rounded-btn bg-muted" />
        <div className="mx-auto h-4 w-24 animate-pulse rounded-btn bg-muted" />
      </div>
      <div className="mx-auto grid w-full max-w-[20rem] grid-cols-5 gap-1.5">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-input bg-muted" />
        ))}
      </div>
      <div className="space-y-1.5">
        {[10, 9, 7].map((n, r) => (
          <div key={r} className="flex justify-center gap-1">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="h-9 w-6 animate-pulse rounded-btn bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
