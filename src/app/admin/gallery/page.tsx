import { requireAdmin } from "@/lib/auth/session";
import { getAllAlbumsAdmin, getAllGalleryImagesAdmin } from "@/lib/gallery/queries";
import { GalleryAlbumsIndex } from "@/components/admin/gallery-albums-index";
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
      <PageHeader title="Gallery" description="Albums are folders — open one to add photos." />
      <GalleryAlbumsIndex albums={albums} images={images} />
    </div>
  );
}
