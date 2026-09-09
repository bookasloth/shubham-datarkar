"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { platformLabel } from "@/lib/playlists/types";
import { setPlaylistPublished, setPlaylistFeatured, deletePlaylist } from "@/lib/playlists/actions";

type Row = {
  id: string;
  title: string;
  slug: string;
  platform: string;
  category: string;
  mood: string;
  featured: boolean;
  published: boolean;
  position: number;
  updatedAt: string;
};

export function PlaylistsTable({ rows }: { rows: Row[] }) {
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
        <Link href={`/admin/playlists/${r.id}`} className="font-medium text-admin-text hover:text-admin-accent">
          {r.title}
        </Link>
      ),
    },
    { key: "platform", header: "Platform", sortValue: (r) => r.platform, cell: (r) => platformLabel(r.platform) },
    { key: "category", header: "Category", sortValue: (r) => r.category, cell: (r) => r.category || "—", hideable: true },
    { key: "mood", header: "Mood", sortValue: (r) => r.mood, cell: (r) => r.mood || "—", hideable: true },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => (r.published ? 1 : 0),
      cell: (r) => (
        <div className="flex gap-1">
          <StatusBadge tone={r.published ? "success" : "neutral"}>{r.published ? "Live" : "Draft"}</StatusBadge>
          {r.featured && <StatusBadge tone="info">Featured</StatusBadge>}
        </div>
      ),
    },
    { key: "position", header: "Pos", sortValue: (r) => r.position, cell: (r) => r.position, hideable: true },
    { key: "updated", header: "Updated", sortValue: (r) => r.updatedAt, cell: (r) => formatDate(r.updatedAt), hideable: true },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.title} ${platformLabel(r.platform)} ${r.category} ${r.mood} ${r.published ? "live" : "draft"}`}
      searchPlaceholder="Search playlists…"
      initialSort={{ key: "position", dir: "asc" }}
      emptyTitle="No playlists yet"
      emptyDescription="Add your first playlist to seed the directory."
      bulkActions={(ids, clear) => (
        <>
          <button
            type="button"
            className="text-admin-text-muted hover:text-admin-text"
            onClick={async () => {
              await Promise.all(ids.map((id) => setPlaylistPublished(id, true)));
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
              await Promise.all(ids.map((id) => setPlaylistPublished(id, false)));
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
            <Link href={`/admin/playlists/${r.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/playlists/${r.slug}`} target="_blank">Preview</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(setPlaylistPublished(r.id, !r.published), r.published ? "Unpublished" : "Published")}>
            {r.published ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(setPlaylistFeatured(r.id, !r.featured), r.featured ? "Unfeatured" : "Featured")}>
            {r.featured ? "Unfeature" : "Feature"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={() => {
              if (confirm(`Delete "${r.title}"? This cannot be undone.`)) run(deletePlaylist(r.id), "Deleted");
            }}
          >
            Delete
          </DropdownMenuItem>
        </>
      )}
    />
  );
}
