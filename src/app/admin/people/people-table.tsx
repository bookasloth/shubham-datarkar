"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";
import { planLabel, type Person } from "@/lib/people/queries";

function Yes({ on, label }: { on: boolean; label: string }) {
  return on ? <StatusBadge tone="success">{label}</StatusBadge> : <span className="text-admin-text-muted">—</span>;
}

const columns: Column<Person>[] = [
  {
    key: "person",
    header: "Person",
    cell: (r) => (
      <Link href={`/admin/people/${encodeURIComponent(r.email)}`} className="font-medium hover:underline">
        {r.displayName}
        <span className="block text-xs text-admin-text-muted">{r.email}</span>
      </Link>
    ),
    sortValue: (r) => r.email,
  },
  { key: "contact", header: "Contact", cell: (r) => <Yes on={r.contacted} label={r.contactCount > 1 ? `${r.contactCount}×` : "Yes"} />, sortValue: (r) => (r.contacted ? 1 : 0) },
  { key: "newsletter", header: "Newsletter", cell: (r) => <Yes on={r.subscribed} label="Yes" />, sortValue: (r) => (r.subscribed ? 1 : 0), hideable: true },
  { key: "donation", header: "Donation", cell: (r) => <Yes on={r.donated} label={`INR ${r.donationTotal}`} />, sortValue: (r) => r.donationTotal, hideable: true },
  { key: "games", header: "Games", cell: (r) => <Yes on={r.isGamer} label="Player" />, sortValue: (r) => (r.isGamer ? 1 : 0), hideable: true },
  {
    key: "membership",
    header: "Membership",
    cell: (r) => {
      const p = planLabel(r);
      return p === "Premium" ? <StatusBadge tone="success">Premium</StatusBadge> : <span className="text-admin-text-muted">{p}</span>;
    },
    sortValue: (r) => planLabel(r),
  },
  { key: "lastSeen", header: "Last seen", cell: (r) => (r.lastSeen ? formatDate(r.lastSeen) : "—"), sortValue: (r) => r.lastSeen ?? "", hideable: true },
];

export function PeopleTable({ rows }: { rows: Person[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.email}
      searchable={(r) => `${r.displayName} ${r.email}`}
      searchPlaceholder="Search people…"
      initialSort={{ key: "lastSeen", dir: "desc" }}
      emptyTitle="No people yet"
      emptyDescription="Everyone who contacts, subscribes, donates, plays, or signs up appears here."
    />
  );
}
