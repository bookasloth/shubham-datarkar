"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string; name: string | null; email: string | null; createdAt: string; bookedAt: string | null;
  source: string | null; utmSource: string | null; utmCampaign: string | null; utmContent: string | null;
  fbclid: string | null; landingPage: string | null; referrer: string | null; aiSource: string | null;
};

/** Most specific known origin, in descending order of usefulness. */
function sourceOf(r: Row): string {
  return r.aiSource ?? r.source ?? r.utmSource ?? r.referrer ?? r.landingPage ?? "—";
}

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortValue: (r) => r.name ?? "", cell: (r) => <span className="font-medium text-admin-text">{r.name ?? "—"}</span> },
  {
    key: "email", header: "Email", sortValue: (r) => r.email ?? "",
    cell: (r) => (r.email ? <a href={`mailto:${r.email}`} className="text-admin-text-muted hover:text-admin-accent">{r.email}</a> : "—"),
  },
  {
    key: "source", header: "Source", sortValue: (r) => sourceOf(r),
    cell: (r) => <span className="text-admin-text-muted" title={r.landingPage ?? ""}>{sourceOf(r)}</span>,
  },
  { key: "campaign", header: "Campaign", sortValue: (r) => r.utmCampaign ?? "", cell: (r) => r.utmCampaign ?? "—", hideable: true },
  { key: "creative", header: "Creative", sortValue: (r) => r.utmContent ?? "", cell: (r) => r.utmContent ?? "—", hideable: true },
  {
    key: "paid", header: "Paid click", sortValue: (r) => (r.fbclid ? "yes" : "no"), hideable: true,
    cell: (r) =>
      r.fbclid ? <StatusBadge tone="success">Meta</StatusBadge> : <span className="text-admin-text-muted">—</span>,
  },
  { key: "landing", header: "Landing", sortValue: (r) => r.landingPage ?? "", cell: (r) => r.landingPage ?? "—", hideable: true },
  { key: "booked", header: "Booked for", sortValue: (r) => r.bookedAt ?? "", cell: (r) => (r.bookedAt ? formatDate(r.bookedAt) : "—"), hideable: true },
  { key: "received", header: "Received", sortValue: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
];

export function BookingsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.name ?? ""} ${r.email ?? ""} ${r.utmCampaign ?? ""} ${r.utmContent ?? ""} ${sourceOf(r)}`}
      searchPlaceholder="Search bookings…"
      initialSort={{ key: "received", dir: "desc" }}
      emptyTitle="No bookings yet"
      emptyDescription="Confirmed consultation bookings (from the scheduler webhook) will appear here."
    />
  );
}
