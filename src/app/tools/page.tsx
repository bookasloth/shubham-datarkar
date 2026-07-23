import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import { tools } from "@/lib/data/tools";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { ToolCard } from "@/components/cards/tool-card";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Free Marketing & SEO Tools",
  description: "Free marketing and SEO tools — audits, calculators, and generators that give value before they ask for an email. No signup required.",
  ogTitle: "Tools that earn trust — free to use",
  ogDescription: "Genuinely useful marketing and SEO tools. Value before they ever ask for an email. No signup.",
  path: "/tools",
});

// ItemList of the free tools — a clean, citable list for "free marketing tools"
// intent. Each live tool is a free SoftwareApplication.
function toolsItemList() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free Marketing & SEO Tools by Shubham Datarkar",
    itemListElement: tools
      .filter((t) => t.status !== "Soon")
      .map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "SoftwareApplication",
          name: t.name,
          description: t.seo?.description ?? t.description,
          applicationCategory: t.content?.appCategory ?? "BusinessApplication",
          operatingSystem: "Web",
          url: `${site.url}/tools/${t.slug}`,
          offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
        },
      })),
  };
}

export default function ToolsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }])} />
      <JsonLd data={toolsItemList()} />
      <PageHero
        eyebrow="Free tools"
        title="Tools that earn trust"
        description="Genuinely useful tools, free to use. They give value before they ever ask for an email."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <StaggerItem key={t.slug}>
                <ToolCard tool={t} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
      <CtaBand title="Need a custom tool built?" />
    </>
  );
}
