"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type Row = {
  id: string; createdAt: string; name: string | null; email: string;
  coffees: number; toffees: number; total: number; status: "pending" | "paid" | "failed";
};

const tone = (s: string) => (s === "paid" ? "success" : s === "failed" ? "danger" : "warning");

const columns: Column<Row>[] = [
  { key: "date", header: "Date", sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
  {
    key: "supporter", header: "Supporter", sortValue: (r) => r.name ?? r.email,
    cell: (r) => (
      <div>
        <div className="font-medium text-admin-text">{r.name ?? "—"}</div>
        <div className="text-xs text-admin-text-muted">{r.email}</div>
      </div>
    ),
  },
  {
    key: "items", header: "Items", hideable: true,
    cell: (r) =>
      [r.coffees > 0 ? `${r.coffees} coffee` : null, r.toffees > 0 ? `${r.toffees} toffee` : null]
        .filter(Boolean).join(" · ") || "—",
  },
  { key: "amount", header: "Amount", sortValue: (r) => r.total, cell: (r) => <span className="font-medium text-admin-text">{inr(r.total)}</span> },
  { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
];

export function PaymentsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.name ?? ""} ${r.email} ${r.status}`}
      searchPlaceholder="Search transactions…"
      initialSort={{ key: "date", dir: "desc" }}
      emptyTitle="No transactions yet"
    />
  );
}
