import { notFound } from "next/navigation";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { getPublishedAlbumBySlug, getPublishedGalleryImages } from "@/lib/gallery/queries";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const album = await getPublishedAlbumBySlug(slug);
  if (!album) return buildMetadata({ title: "Album not found", path: `/gallery/${slug}`, noIndex: true });
  return buildMetadata({
    title: album.title,
    description: album.description ?? `Photos in ${album.title}.`,
    path: `/gallery/${album.slug}`,
  });
}

export default async function AlbumPage({ params }: Params) {
  const { slug } = await params;
  const album = await getPublishedAlbumBySlug(slug);
  if (!album) notFound();

  const images = await getPublishedGalleryImages(album.id);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Gallery", path: "/gallery" },
            { name: album.title, path: `/gallery/${album.slug}` },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Album"
        title={album.title}
        description={album.description ?? undefined}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Gallery", href: "/gallery" },
          { label: album.title },
        ]}
      />
      <Section>
        <Container>
          <GalleryGrid images={images} />
        </Container>
      </Section>
    </>
  );
}
