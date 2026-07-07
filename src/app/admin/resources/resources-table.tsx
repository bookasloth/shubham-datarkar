"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  type: string;
  category: string;
  visibility: string;
  status: string;
  featured: boolean;
  views: number;
  updatedAt: string;
};

const statusTone = (s: string) => (s === "published" ? "success" : s === "archived" ? "warning" : "neutral");
const visibilityTone = (v: string) => (v === "premium" ? "info" : v === "hidden" ? "warning" : "neutral");

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Title",
    sortValue: (r) => r.title,
    cell: (r) => (
      <Link href={`/admin/resources/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
        {r.featured ? "★ " : ""}
        {r.title}
      </Link>
    ),
  },
  { key: "type", header: "Type", sortValue: (r) => r.type, cell: (r) => r.type },
  { key: "category", header: "Category", sortValue: (r) => r.category, cell: (r) => r.category, hideable: true },
  {
    key: "visibility",
    header: "Visibility",
    sortValue: (r) => r.visibility,
    cell: (r) => <StatusBadge tone={visibilityTone(r.visibility)}>{r.visibility}</StatusBadge>,
  },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => r.status,
    cell: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>,
  },
  { key: "views", header: "Views", sortValue: (r) => r.views, cell: (r) => r.views, hideable: true },
  { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
];

export function ResourcesTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.type} ${r.category} ${r.status} ${r.visibility}`}
      searchPlaceholder="Search resources…"
      initialSort={{ key: "updated", dir: "desc" }}
      emptyTitle="No resources yet"
      emptyDescription="Create your first resource to seed the members library."
    />
  );
}
