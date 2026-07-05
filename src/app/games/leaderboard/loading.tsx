export default function LeaderboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 animate-pulse rounded-btn bg-muted" />
      <div className="h-9 w-64 animate-pulse rounded-input bg-muted" />
      <div className="space-y-2 rounded-card border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded-btn bg-muted" />
        ))}
      </div>
    </div>
  );
}
