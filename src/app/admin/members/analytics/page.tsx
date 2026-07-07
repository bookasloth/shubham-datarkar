import {
  getMemberStats,
  getPopularResources,
  getRequestBreakdown,
  getTopSearches,
} from "@/lib/members/analytics-queries";
import { PageHeader } from "@/components/admin";
import { KPIWidget } from "@/components/admin/widgets/kpi-widget";

export const dynamic = "force-dynamic";

export default async function MembersAnalyticsPage() {
  const [stats, popular, searches, requests] = await Promise.all([
    getMemberStats(),
    getPopularResources(10),
    getTopSearches(10),
    getRequestBreakdown(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members analytics"
        description="Engagement across the members library — last 30 days unless noted."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPIWidget label="Accounts" value={stats.accounts} href="/admin/members" />
        <KPIWidget label="Active premium" value={stats.activePremium} href="/admin/members" />
        <KPIWidget label="Published resources" value={stats.publishedResources} href="/admin/resources" />
        <KPIWidget label="Views (30d)" value={stats.viewsLast30d} />
        <KPIWidget label="Downloads (30d)" value={stats.downloadsLast30d} />
        <KPIWidget label="Open requests" value={stats.openRequests} href="/admin/requests" />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Popular resources (all time)</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Title</th>
                <th className="py-1.5 font-medium">Views</th>
                <th className="py-1.5 font-medium">Saves</th>
                <th className="py-1.5 font-medium">DLs</th>
              </tr>
            </thead>
            <tbody>
              {popular.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="max-w-[16rem] truncate py-1.5 pr-2">{r.title}</td>
                  <td className="py-1.5">{r.view_count}</td>
                  <td className="py-1.5">{r.bookmark_count}</td>
                  <td className="py-1.5">{r.download_count}</td>
                </tr>
              ))}
              {!popular.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No published resources yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="rounded-card border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Top searches</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {searches.map((s) => (
                <li key={s.query} className="flex justify-between gap-3">
                  <span className="truncate">{s.query}</span>
                  <span className="text-muted-foreground">{s.count}</span>
                </li>
              ))}
              {!searches.length && (
                <li className="text-muted-foreground">No searches logged yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-card border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Requests by kind</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {requests.map((r) => (
                <li key={r.kind} className="flex justify-between gap-3 capitalize">
                  <span>{r.kind}</span>
                  <span className="text-muted-foreground">
                    {r.open} open / {r.total} total
                  </span>
                </li>
              ))}
              {!requests.length && <li className="text-muted-foreground">No requests yet.</li>}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
