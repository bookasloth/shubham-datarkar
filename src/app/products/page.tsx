import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { products } from "@/lib/data/products";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { ProductCard } from "@/components/cards/product-card";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Products",
  description: "The Timewheel Internet product portfolio — scheduling, ticketing, communities, creator tools, messaging, and SEO. Each its own brand.",
  path: "/products",
});

export default function ProductsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }])} />
      <PageHero
        eyebrow="Products"
        title="Software that compounds"
        description="The Timewheel Internet portfolio — a family of focused products, each with its own brand and job to do. Built calm, fast, and free of bloat."
        crumbs={[{ label: "Home", href: "/" }, { label: "Products" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <StaggerItem key={p.slug}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
      <CtaBand title="Want early access?" description="The newest products ship to the newsletter first. Join to get in early." />
    </>
  );
}
