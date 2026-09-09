"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { setBookPublished, deleteBook, duplicateBook } from "@/lib/books/actions";

type Row = {
  id: string;
  slug: string;
  title: string;
  author: string;
  status: string;
  percentage: number | null;
  rating: string;
  genres: string;
  published: boolean;
  reviewPublished: boolean;
  updatedAt: string;
};

const STATUS_TONE: Record<string, "success" | "info" | "neutral"> = {
  finished: "success",
  currently_reading: "info",
};

export function BooksTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function run(p: Promise<{ ok: true } | { error: string } | { ok: true; id: string; slug: string }>, ok: string) {
    const res = await p;
    if ("error" in res) toast({ title: res.error, variant: "danger" });
    else {
      toast({ title: ok, variant: "success" });
      router.refresh();
    }
  }

  const columns: Column<Row>[] = [
    {
      key: "title",
      header: "Title",
      sortValue: (r) => r.title,
      cell: (r) => (
        <Link href={`/admin/books/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
          {r.title}
        </Link>
      ),
    },
    { key: "author", header: "Author", sortValue: (r) => r.author, cell: (r) => r.author || "—", hideable: true },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <div className="flex gap-1">
          <StatusBadge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</StatusBadge>
          {!r.reviewPublished && <StatusBadge tone="warning">No review</StatusBadge>}
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      sortValue: (r) => r.percentage ?? 0,
      cell: (r) => (r.percentage != null ? `${r.percentage}%` : "—"),
      hideable: true,
    },
    { key: "rating", header: "Rating", sortValue: (r) => Number(r.rating) || 0, cell: (r) => r.rating || "—" },
    { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.author} ${r.genres} ${r.status}`}
      searchPlaceholder="Search books…"
      initialSort={{ key: "updated", dir: "desc" }}
      emptyTitle="No books yet"
      emptyDescription="Add your first book to seed the library."
      bulkActions={(ids, clear) => (
        <>
          <button
            type="button"
            className="text-admin-text-muted hover:text-admin-text"
            onClick={async () => {
              await Promise.all(ids.map((id) => setBookPublished(id, true)));
              toast({ title: "Published", variant: "success" });
              clear();
              router.refresh();
            }}
          >
            Publish
          </button>
          <button
            type="button"
            className="text-admin-text-muted hover:text-admin-text"
            onClick={async () => {
              await Promise.all(ids.map((id) => setBookPublished(id, false)));
              toast({ title: "Unpublished", variant: "success" });
              clear();
              router.refresh();
            }}
          >
            Unpublish
          </button>
        </>
      )}
      rowActions={(r) => (
        <>
          <DropdownMenuItem asChild>
            <Link href={`/admin/books/${r.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/books/${r.slug}`} target="_blank">Preview</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(setBookPublished(r.id, !r.published), r.published ? "Unpublished" : "Published")}>
            {r.published ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(duplicateBook(r.id), "Duplicated")}>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() => {
              if (confirm(`Delete "${r.title}"? This cannot be undone.`)) run(deleteBook(r.id), "Deleted");
            }}
          >
            Delete
          </DropdownMenuItem>
        </>
      )}
    />
  );
}
