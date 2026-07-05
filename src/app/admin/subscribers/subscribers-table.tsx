"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = { id: string; email: string; source: string | null; status: string; createdAt: string };

const columns: Column<Row>[] = [
  { key: "email", header: "Email", cell: (r) => <span className="font-medium">{r.email}</span>, sortValue: (r) => r.email },
  { key: "source", header: "Source", cell: (r) => r.source ?? "—", sortValue: (r) => r.source, hideable: true },
  { key: "status", header: "Status", cell: (r) => <StatusBadge tone={r.status === "active" ? "success" : "neutral"}>{r.status}</StatusBadge>, sortValue: (r) => r.status },
  { key: "joined", header: "Joined", cell: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt, hideable: true },
];

export function SubscribersTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.email} ${r.source ?? ""} ${r.status}`}
      searchPlaceholder="Search subscribers…"
      initialSort={{ key: "joined", dir: "desc" }}
      emptyTitle="No subscribers yet"
      emptyDescription="Subscribers will appear here as people join."
    />
  );
}
