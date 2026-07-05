export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-btn bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
