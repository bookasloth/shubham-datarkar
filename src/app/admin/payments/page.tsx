import { getPaymentStats, getRecentSupports } from "@/lib/payments/queries";

export const dynamic = "force-dynamic";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_STYLE: Record<string, string> = {
  paid: "text-success",
  pending: "text-muted-foreground",
  failed: "text-danger",
};

export default async function AdminPaymentsPage() {
  const [stats, txns] = await Promise.all([getPaymentStats(), getRecentSupports(50)]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Payments</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Raised" value={inr(stats.raised)} />
        <Stat label="This month" value={inr(stats.thisMonth)} />
        <Stat label="Supporters" value={String(stats.supporters)} />
        <Stat label="Paid" value={String(stats.paidCount)} />
        <Stat label="Pending" value={String(stats.pendingCount)} />
        <Stat label="Failed" value={String(stats.failedCount)} />
      </div>

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Recent transactions
      </h2>
      <div className="mt-3 overflow-hidden rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Supporter</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="font-medium">{t.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{t.email}</div>
                </td>
                <td className="p-3 text-muted-foreground">
                  {[
                    t.coffees > 0 ? `${t.coffees} coffee` : null,
                    t.toffees > 0 ? `${t.toffees} toffee` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="p-3 font-medium">{inr(t.total)}</td>
                <td className={`p-3 font-medium ${STATUS_STYLE[t.status] ?? ""}`}>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
