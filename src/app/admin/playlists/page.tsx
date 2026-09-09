import Link from "next/link";
import { AdminButton, PageHeader } from "@/components/admin";
import { getAllPlaylistsAdmin } from "@/lib/playlists/queries";
import { PlaylistsTable } from "./playlists-table";

export const dynamic = "force-dynamic";

export default async function AdminPlaylistsPage() {
  const playlists = await getAllPlaylistsAdmin();
  return (
    <div>
      <PageHeader
        title="Playlists"
        description="Curated playlists linked out to Spotify, YouTube, Apple Music and more."
        actions={
          <AdminButton asChild size="sm">
            <Link href="/admin/playlists/new">New playlist</Link>
          </AdminButton>
        }
      />
      <PlaylistsTable
        rows={playlists.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          platform: p.platform,
          category: p.category ?? "",
          mood: p.mood ?? "",
          featured: p.isFeatured,
          published: p.isPublished,
          position: p.position,
          updatedAt: p.updatedAt,
        }))}
      />
    </div>
  );
}
