"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { setMoviePublished, deleteMovie, duplicateMovie } from "@/lib/movies/actions";

type Row = {
  id: string;
  title: string;
  slug: string;
  year: string;
  rating: string;
  recommendation: string;
  published: boolean;
  reviewPublished: boolean;
  genres: string;
  updatedAt: string;
};

export function MoviesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function run(p: Promise<{ ok: true } | { error: string } | { ok: true; slug: string }>, ok: string) {
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
        <Link href={`/admin/movies/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
          {r.title}
        </Link>
      ),
    },
    { key: "year", header: "Year", sortValue: (r) => r.year, cell: (r) => r.year, hideable: true },
    { key: "rating", header: "Rating", sortValue: (r) => Number(r.rating) || 0, cell: (r) => r.rating || "—" },
    {
      key: "recommendation",
      header: "Recommendation",
      sortValue: (r) => r.recommendation,
      cell: (r) => r.recommendation || "—",
      hideable: true,
    },
    { key: "genres", header: "Genres", sortValue: (r) => r.genres, cell: (r) => r.genres || "—", hideable: true },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => (r.published ? 1 : 0),
      cell: (r) => (
        <div className="flex gap-1">
          <StatusBadge tone={r.published ? "success" : "neutral"}>
            {r.published ? "Live" : "Draft"}
          </StatusBadge>
          {r.published && !r.reviewPublished && <StatusBadge tone="warning">No review</StatusBadge>}
        </div>
      ),
    },
    { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${r.recommendation} ${r.genres} ${r.year}`}
      searchPlaceholder="Search movies…"
      initialSort={{ key: "updated", dir: "desc" }}
      emptyTitle="No movies yet"
      emptyDescription="Add your first recommendation to seed the library."
      bulkActions={(ids, clear) => (
        <>
          <button
            type="button"
            className="text-admin-text-muted hover:text-admin-text"
            onClick={async () => {
              await Promise.all(ids.map((id) => setMoviePublished(id, true)));
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
              await Promise.all(ids.map((id) => setMoviePublished(id, false)));
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
            <Link href={`/admin/movies/${r.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/movies/${r.slug}`} target="_blank">Preview</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(setMoviePublished(r.id, !r.published), r.published ? "Unpublished" : "Published")}>
            {r.published ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(duplicateMovie(r.id), "Duplicated")}>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() => {
              if (confirm(`Delete "${r.title}"? This cannot be undone.`)) run(deleteMovie(r.id), "Deleted");
            }}
          >
            Delete
          </DropdownMenuItem>
        </>
      )}
    />
  );
}
