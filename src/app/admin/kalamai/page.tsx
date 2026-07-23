import Link from "next/link";
import { getKalamaiUsage, type KalamaiUsageRow } from "@/lib/kalamai/admin-queries";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-IN");

export default async function AdminKalamaiUsagePage() {
  let rows: KalamaiUsageRow[] | null = null;
  let loadError = false;
  try {
    rows = await getKalamaiUsage();
  } catch {
    loadError = true;
  }

  const totalInr = (rows ?? []).reduce((s, r) => s + r.costInr, 0);
  const totalTokens = (rows ?? []).reduce((s, r) => s + r.inTokens + r.outTokens, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KalamAI Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every analysis and article run — user, query, model, tokens, and cost. Cost is the real cost logged per call,
          so cached tokens (read at 0.1×) are already discounted. Cached tokens are shown next to in/out.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load usage. This is a fetch error, not an empty list.
        </div>
      ) : rows && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No KalamAI runs yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-6 rounded-card border border-border bg-muted/30 px-4 py-3 text-sm">
            <span><span className="font-semibold">{rows?.length}</span> <span className="text-muted-foreground">runs</span></span>
            <span><span className="font-semibold">{nf.format(totalTokens)}</span> <span className="text-muted-foreground">tokens</span></span>
            <span><span className="font-semibold">₹{nf.format(Math.round(totalInr))}</span> <span className="text-muted-foreground">est. spend</span></span>
          </div>

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Query</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2 text-right tabular-nums">Tokens (in / out)</th>
                  <th className="px-3 py-2 text-right tabular-nums">Est. cost</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows?.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="hover:bg-accent">
                    <td className="px-3 py-2 font-medium">{r.user}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tools/kalamai/${r.kind === "article" ? "w" : "a"}/${r.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.keyword}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{r.kind}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.model}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {nf.format(r.inTokens)} / {nf.format(r.outTokens)}
                      {r.cacheReadTokens > 0 && (
                        <span className="ml-1 text-success">· {nf.format(r.cacheReadTokens)} cached</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">₹{r.costInr.toFixed(2)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.result}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
