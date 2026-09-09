"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { setCollectionPublished, deleteCollection } from "@/lib/books/actions";

type Row = {
  id: string;
  title: string;
  slug: string;
  count: number;
  published: boolean;
  updatedAt: string;
};

export function ShelvesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { toast } = useToast();

  async function run(p: Promise<{ ok: true } | { error: string }>, ok: string) {
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
        <Link href={`/admin/books/shelves/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
          {r.title}
        </Link>
      ),
    },
    { key: "count", header: "Books", sortValue: (r) => r.count, cell: (r) => r.count },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => (r.published ? 1 : 0),
      cell: (r) => (
        <StatusBadge tone={r.published ? "success" : "neutral"}>{r.published ? "Live" : "Hidden"}</StatusBadge>
      ),
    },
    { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => r.title}
      searchPlaceholder="Search shelves…"
      initialSort={{ key: "updated", dir: "desc" }}
      emptyTitle="No shelves yet"
      emptyDescription="Group books into editorial shelves like “Best Thrillers”."
      rowActions={(r) => (
        <>
          <DropdownMenuItem asChild>
            <Link href={`/admin/books/shelves/${r.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/books/shelf/${r.slug}`} target="_blank">View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(setCollectionPublished(r.id, !r.published), r.published ? "Hidden" : "Published")}>
            {r.published ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() => {
              if (confirm(`Delete "${r.title}"? The books stay; only the shelf is removed.`))
                run(deleteCollection(r.id), "Deleted");
            }}
          >
            Delete
          </DropdownMenuItem>
        </>
      )}
    />
  );
}
