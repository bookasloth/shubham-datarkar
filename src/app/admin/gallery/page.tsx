import { requireAdmin } from "@/lib/auth/session";
import { getAllAlbumsAdmin, getAllGalleryImagesAdmin } from "@/lib/gallery/queries";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { PageHeader } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  await requireAdmin();
  const [images, albums] = await Promise.all([
    getAllGalleryImagesAdmin(),
    getAllAlbumsAdmin(),
  ]);

  return (
    <div>
      <PageHeader title="Gallery" />
      <GalleryManager initialImages={images} initialAlbums={albums} />
    </div>
  );
}
