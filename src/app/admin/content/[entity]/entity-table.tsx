"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";

type Row = { id: string; title: string; slug: string | null; published: boolean };

export function EntityTable({ rows, entityKey }: { rows: Row[]; entityKey: string }) {
  const columns: Column<Row>[] = [
    {
      key: "title", header: "Title", sortValue: (r) => r.title,
      cell: (r) => (
        <Link href={`/admin/content/${entityKey}/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
          {r.title}
        </Link>
      ),
    },
    {
      key: "status", header: "Status", sortValue: (r) => (r.published ? "published" : "draft"),
      cell: (r) => <StatusBadge tone={r.published ? "success" : "neutral"}>{r.published ? "published" : "draft"}</StatusBadge>,
    },
    { key: "slug", header: "Slug", sortValue: (r) => r.slug, cell: (r) => r.slug ?? "—", hideable: true },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.slug ?? ""}`}
      searchPlaceholder="Search…"
      initialSort={{ key: "title", dir: "asc" }}
      emptyTitle="Nothing here yet"
    />
  );
}
