"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string; title: string; slug: string; category: string;
  status: "draft" | "published" | "scheduled"; updatedAt: string;
};

const tone = (s: string) => (s === "published" ? "success" : s === "scheduled" ? "info" : "neutral");

const columns: Column<Row>[] = [
  {
    key: "title", header: "Title", sortValue: (r) => r.title,
    cell: (r) => (
      <Link href={`/admin/posts/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
        {r.title}
      </Link>
    ),
  },
  { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge> },
  { key: "category", header: "Category", sortValue: (r) => r.category, cell: (r) => r.category, hideable: true },
  { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
];

export function PostsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.category} ${r.status}`}
      searchPlaceholder="Search posts…"
      initialSort={{ key: "updated", dir: "desc" }}
      emptyTitle="No posts yet"
      emptyDescription="Create your first post to get started."
    />
  );
}
