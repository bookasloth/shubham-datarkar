import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { getPublishedGalleryImages } from "@/lib/gallery/queries";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export const metadata = buildMetadata({
  title: "Gallery",
  description: "A visual gallery — moments, places, and work in progress, straight from the camera roll.",
  path: "/gallery",
});

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

export default async function GalleryPage() {
  const images = await getPublishedGalleryImages();
  return (
    <>
      <JsonLd
        data={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Gallery", path: "/gallery" }])]}
      />
      <PageHero
        eyebrow="Gallery"
        title="In pictures"
        description="Moments, places, and work in progress."
        crumbs={[{ label: "Home", href: "/" }, { label: "Gallery" }]}
      />
      <Section>
        <Container>
          <GalleryGrid images={images} />
        </Container>
      </Section>
    </>
  );
}
