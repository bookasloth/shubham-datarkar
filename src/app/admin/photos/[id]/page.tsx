import { notFound } from "next/navigation";
import { getPhotoPublicUrl } from "@/lib/photos/photo-url";
import { getPhotoByIdAdmin } from "@/lib/photos/queries";
import { updatePhoto, deletePhoto } from "@/lib/photos/actions";
import { PhotoEditor } from "@/components/admin/photo-editor";
import { Button } from "@/components/ui/button";
import type { Photo } from "@/lib/photos/types";

export const dynamic = "force-dynamic";

export default async function EditPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Error-surfacing variant (Task 1 carryover): a genuine not-found returns
  // null → notFound(); a DB/auth failure throws → we render an error state
  // rather than a misleading "not found".
  let photo: Photo | null = null;
  let loadError = false;
  try {
    photo = await getPhotoByIdAdmin(id);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit photo</h1>
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load this photo. This is a fetch error, not a missing record.
          Check your connection and try again.
        </div>
      </div>
    );
  }

  if (!photo) notFound();

  const update = updatePhoto.bind(null, id);
  const remove = deletePhoto.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit photo</h1>
        <form action={remove}>
          <Button type="submit" variant="outline" size="sm">
            Delete
          </Button>
        </form>
      </div>
      <PhotoEditor
        action={update}
        photo={{
          storagePath: photo.storagePath,
          imageUrl: getPhotoPublicUrl(photo.storagePath),
          title: photo.title,
          description: photo.description,
          tags: photo.tags,
          sortOrder: photo.sortOrder,
          published: photo.published,
        }}
      />
    </div>
  );
}
