import { getPaymentStats, getRecentSupports } from "@/lib/payments/queries";
import { PageHeader } from "@/components/admin";
import { KPIWidget } from "@/components/admin/widgets";
import { PaymentsTable } from "./payments-table";

export const dynamic = "force-dynamic";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default async function AdminPaymentsPage() {
  const [stats, txns] = await Promise.all([getPaymentStats(), getRecentSupports(50)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KPIWidget label="Raised" value={inr(stats.raised)} />
        <KPIWidget label="This month" value={inr(stats.thisMonth)} />
        <KPIWidget label="Supporters" value={stats.supporters} />
        <KPIWidget label="Paid" value={stats.paidCount} />
        <KPIWidget label="Pending" value={stats.pendingCount} />
        <KPIWidget label="Failed" value={stats.failedCount} />
      </div>
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">Recent transactions</h2>
        <PaymentsTable rows={txns} />
      </div>
    </div>
  );
}
