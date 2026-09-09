import { notFound } from "next/navigation";
import { PlaylistEditor } from "@/components/admin/playlist-editor";
import { PlaylistDeleteButton } from "@/components/admin/playlist-delete-button";
import { getPlaylistByIdAdmin } from "@/lib/playlists/queries";

export const dynamic = "force-dynamic";

export default async function EditPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playlist = await getPlaylistByIdAdmin(id);
  if (!playlist) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Edit playlist</h1>
        <PlaylistDeleteButton id={playlist.id} title={playlist.title} />
      </div>
      <PlaylistEditor mode="edit" playlist={playlist} />
    </div>
  );
}
