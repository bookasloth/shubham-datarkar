import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import type { Service } from "@/lib/data/types";
import { getPublishedEntities } from "@/lib/content/queries";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/layout/section-heading";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { ServiceCard } from "@/components/cards/service-card";
import { Card } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Services",
  description: "SEO, performance marketing, content, AI automation, and founder advisory — productized and outcome-first.",
  path: "/services",
});

const how = [
  { step: "Audit", detail: "Understand the business and find what's actually winnable." },
  { step: "Design", detail: "Design the mechanism that will compound — not a campaign." },
  { step: "Build", detail: "Ship it, hands-on, with quality gates at every step." },
  { step: "Compound", detail: "Instrument it, hand it over, and let it run without me." },
];

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getPublishedEntities<Service>("services");
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }])} />
      <PageHero
        eyebrow="Services"
        title="How I can help"
        description="Productized engagements with clear outcomes. Pick a path, or book a call and we'll figure out the right one together."
        crumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <StaggerItem key={s.slug}>
                <ServiceCard service={s} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading eyebrow="How it works" title="The same operating system, every time" />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {how.map((h, i) => (
              <StaggerItem key={h.step}>
                <Card className="h-full p-6">
                  <span className="font-display text-sm font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{h.step}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.detail}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
