import Link from "next/link";
import { Download } from "lucide-react";
import { getSubscribers } from "@/lib/subscribers/queries";
import { AdminButton } from "@/components/admin";
import { SubscribersTable } from "./subscribers-table";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-admin-text">Subscribers</h1>
          <p className="mt-1 text-sm text-admin-text-muted">{subscribers.length} total</p>
        </div>
        <AdminButton asChild variant="secondary" size="sm">
          <Link href="/admin/subscribers/export" aria-disabled={subscribers.length === 0}>
            <Download />
            Download CSV
          </Link>
        </AdminButton>
      </div>
      <SubscribersTable rows={subscribers} />
    </div>
  );
}
