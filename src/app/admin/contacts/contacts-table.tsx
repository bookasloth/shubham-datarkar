"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string; name: string; email: string; createdAt: string;
  projectType?: string | null; budget?: string | null; message: string; notified: boolean;
  firstLandingPage?: string | null; aiSource?: string | null; utmSource?: string | null; pagesSeen?: number | null;
};

/** Most specific known origin, in descending order of usefulness. */
function sourceOf(r: Row): string {
  return r.aiSource ?? r.utmSource ?? r.firstLandingPage ?? "—";
}

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => <span className="font-medium text-admin-text">{r.name}</span> },
  {
    key: "email", header: "Email", sortValue: (r) => r.email,
    cell: (r) => <a href={`mailto:${r.email}`} className="text-admin-text-muted hover:text-admin-accent">{r.email}</a>,
  },
  { key: "type", header: "Type", sortValue: (r) => r.projectType ?? "", cell: (r) => r.projectType ?? "—", hideable: true },
  { key: "budget", header: "Budget", sortValue: (r) => r.budget ?? "", cell: (r) => r.budget ?? "—", hideable: true },
  {
    key: "source", header: "Source", sortValue: (r) => sourceOf(r), hideable: true,
    cell: (r) => <span className="text-admin-text-muted" title={r.firstLandingPage ?? ""}>{sourceOf(r)}</span>,
  },
  { key: "pages", header: "Pages", sortValue: (r) => r.pagesSeen ?? 0, cell: (r) => r.pagesSeen ?? "—", hideable: true },
  {
    key: "message", header: "Message",
    cell: (r) => <span className="block max-w-xs truncate text-admin-text-muted" title={r.message}>{r.message}</span>,
  },
  { key: "received", header: "Received", sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt), hideable: true },
  {
    key: "emailed", header: "Emailed", sortValue: (r) => (r.notified ? "yes" : "no"),
    cell: (r) => <StatusBadge tone={r.notified ? "success" : "warning"}>{r.notified ? "sent" : "not sent"}</StatusBadge>,
  },
];

export function ContactsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.name} ${r.email} ${r.message} ${r.projectType ?? ""} ${sourceOf(r)}`}
      searchPlaceholder="Search contacts…"
      initialSort={{ key: "received", dir: "desc" }}
      emptyTitle="No submissions yet"
      emptyDescription="Contact-form submissions will appear here."
    />
  );
}
