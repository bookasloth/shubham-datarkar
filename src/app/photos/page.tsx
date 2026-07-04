import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { getPublishedPhotos, getDistinctTags } from "@/lib/photos/queries";
import { computeHasMore } from "@/lib/photos/gallery";
import { PhotoGallery } from "@/components/photos/photo-gallery";

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

const PAGE_SIZE = 12;

export const metadata = buildMetadata({
  title: "Photos",
  description:
    "A visual field notebook — moments from building companies, travel, and the road in between, shot by Shubham Datarkar.",
  path: "/photos",
});

export default async function PhotosPage() {
  const [photos, tags] = await Promise.all([
    getPublishedPhotos({ offset: 0, limit: PAGE_SIZE }),
    getDistinctTags(),
  ]);
  const hasMore = computeHasMore(photos.length, photos.length, PAGE_SIZE);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Photos", path: "/photos" },
        ])}
      />
      <PageHero
        eyebrow="Gallery"
        title="Photos"
        description="A visual field notebook — moments from building companies, travel, and the road in between."
        crumbs={[{ label: "Home", href: "/" }, { label: "Photos" }]}
      />

      <Section>
        <Container>
          <PhotoGallery initialPhotos={photos} initialHasMore={hasMore} tags={tags} />
        </Container>
      </Section>
    </>
  );
}
