import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import type { CaseStudy } from "@/lib/data/types";
import { getPublishedEntities } from "@/lib/content/queries";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { CaseStudyCard } from "@/components/cards/case-study-card";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "SEO & Growth Case Studies",
  description:
    "Real outcomes with real numbers — SEO, performance marketing, AI content, and brand repositioning case studies. The before, the after, the how.",
  ogTitle: "Proof, not promises",
  ogDescription:
    "Every engagement is built to compound. The before, the after, and exactly how we got there — real numbers, no vanity metrics.",
  path: "/case-studies",
});

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

export default async function CaseStudiesPage() {
  const caseStudies = await getPublishedEntities<CaseStudy>("case_studies");
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Case Studies", path: "/case-studies" }])} />
      <PageHero
        blueprint
        eyebrow="Case studies"
        title="Proof, not promises"
        description="Every engagement is built to compound. Here's the before, the after, and exactly how we got there."
        crumbs={[{ label: "Home", href: "/" }, { label: "Case Studies" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((c) => (
              <StaggerItem key={c.slug}>
                <CaseStudyCard study={c} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
      <CtaBand title="Want results like this?" />
    </>
  );
}
