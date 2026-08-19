import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { getPublishedAlbums, getPublishedGalleryImages } from "@/lib/gallery/queries";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { AlbumCard } from "@/components/gallery/album-card";

export const metadata = buildMetadata({
  title: "Gallery",
  description: "A visual gallery — albums and moments, straight from the camera roll.",
  path: "/gallery",
});

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

export default async function GalleryPage() {
  const [albums, allImages] = await Promise.all([
    getPublishedAlbums(),
    getPublishedGalleryImages(),
  ]);
  // Images not in any album still show, under the album grid.
  const unfiled = allImages.filter((i) => !i.albumId);

  return (
    <>
      <JsonLd
        data={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Gallery", path: "/gallery" }])]}
      />
      <PageHero
        eyebrow="Gallery"
        title="In pictures"
        description="Albums, moments, and work in progress."
        crumbs={[{ label: "Home", href: "/" }, { label: "Gallery" }]}
      />
      <Section>
        <Container>
          {albums.length > 0 && (
            <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}
          {unfiled.length > 0 && (
            <>
              {albums.length > 0 && (
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  More photos
                </h2>
              )}
              <GalleryGrid images={unfiled} />
            </>
          )}
          {albums.length === 0 && unfiled.length === 0 && <GalleryGrid images={[]} />}
        </Container>
      </Section>
    </>
  );
}
