import { PageHeader } from "@/components/admin";
import { PlaylistEditor } from "@/components/admin/playlist-editor";

export const dynamic = "force-dynamic";

export default function NewPlaylistPage() {
  return (
    <div>
      <PageHeader title="New playlist" description="Paste a playlist link to auto-fill, then add your notes." />
      <PlaylistEditor mode="create" />
    </div>
  );
}
