import { createPhoto } from "@/lib/photos/actions";
import { PhotoEditor } from "@/components/admin/photo-editor";

export default function NewPhotoPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New photo</h1>
      <PhotoEditor action={createPhoto} />
    </div>
  );
}
