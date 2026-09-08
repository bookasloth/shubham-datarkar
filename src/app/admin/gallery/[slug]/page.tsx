import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  getAlbumBySlugAdmin, getAllAlbumsAdmin, getGalleryImagesByAlbumAdmin,
} from "@/lib/gallery/queries";
import { GalleryAlbumView } from "@/components/admin/gallery-album-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function AdminAlbumPage({ params }: Params) {
  await requireAdmin();
  const { slug } = await params;

  // "unfiled" is the reserved pseudo-album for photos not in any album.
  const album = slug === "unfiled" ? null : await getAlbumBySlugAdmin(slug);
  if (slug !== "unfiled" && !album) notFound();

  const [images, albums] = await Promise.all([
    getGalleryImagesByAlbumAdmin(album?.id ?? null),
    getAllAlbumsAdmin(),
  ]);

  return <GalleryAlbumView album={album} initialImages={images} albums={albums} />;
}
