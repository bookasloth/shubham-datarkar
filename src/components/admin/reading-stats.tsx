import { KPIWidget, RecentCard } from "@/components/admin/widgets";
import type { ReadingStats } from "@/lib/books/reading-stats";

export function ReadingStats({ stats }: { stats: ReadingStats }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPIWidget label="Currently reading" value={stats.currentlyReading.length} />
        <KPIWidget label="Finished this year" value={stats.finishedThisYear} />
        <KPIWidget label="Pages read" value={stats.pagesRead.toLocaleString()} />
        <KPIWidget label="Average rating" value={stats.averageRating ?? "—"} />
        <KPIWidget label="Want to read" value={stats.wantToRead} />
      </div>

      <RecentCard
        title="Currently reading"
        viewAllHref="/admin/books"
        isEmpty={stats.currentlyReading.length === 0}
      >
        {stats.currentlyReading.map((b) => (
          <li key={b.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-admin-text">{b.title}</span>
            <span className="shrink-0 text-xs text-admin-text-muted">{b.percentage}%</span>
          </li>
        ))}
      </RecentCard>
    </div>
  );
}
