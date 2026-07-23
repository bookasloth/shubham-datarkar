import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema, seoLandingSchema } from "@/lib/seo";
import { seoCities, seoCitySlugs, getSeoCity } from "@/lib/data/seo-cities";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { BentoCard } from "@/components/blueprint";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR
export const dynamicParams = false; // unknown city → 404, never a soft-404

export function generateStaticParams() {
  return seoCitySlugs.map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const c = getSeoCity(city);
  if (!c) return {};
  return buildMetadata({
    title: `SEO Expert in ${c.city}`,
    description: `${c.lead}. SEO, AEO, and GEO services for ${c.city}, ${c.state} businesses — audits, on-page, technical, and content that ranks. ${c.market.split(".")[0]}.`.slice(0, 158),
    path: `/seo-expert-india/${c.slug}`,
  });
}

export default async function SeoCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const c = getSeoCity(city);
  if (!c) notFound();

  const others = seoCities.filter((x) => x.slug !== c.slug);

  return (
    <>
      <JsonLd
        data={[
          seoLandingSchema({
            path: `/seo-expert-india/${c.slug}`,
            name: `SEO Expert in ${c.city}`,
            areaServed: { type: "City", name: c.city },
            offers: [],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "SEO Expert in India", path: "/seo-expert-india" },
            { name: c.city, path: `/seo-expert-india/${c.slug}` },
          ]),
          faqSchema(c.faqs),
        ]}
      />

      <PageHero
        blueprint
        eyebrow={`SEO Expert · ${c.city}`}
        title={`SEO Expert in ${c.city}`}
        description={c.lead}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "SEO Expert in India", href: "/seo-expert-india" },
          { label: c.city },
        ]}
        actions={
          <>
            <a
              href={site.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              <BrandIcon name="CalendarCheck" />
              Book a call
            </a>
            <Link href="/seo-expert-india#pricing" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See pricing
            </Link>
          </>
        }
      />

      {/* Market */}
      <Section>
        <Container size="narrow">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">
              The {c.city} market — and why it&apos;s under-ranked
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{c.market}</p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{c.angle}</p>
          </Reveal>
        </Container>
      </Section>

      {/* Who we work with */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-2xl font-bold tracking-tight">Who I help rank in {c.city}</h2>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.buyers.map((b) => (
              <StaggerItem key={b}>
                <BentoCard className="h-full" title={b} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* FAQ */}
      <Section className="pt-0">
        <Container size="narrow">
          <h2 className="text-2xl font-bold tracking-tight">SEO in {c.city} — common questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {c.faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      {/* Cross-links to sibling cities (no orphans) */}
      <Section className="border-t border-border pt-12">
        <Container>
          <h2 className="text-lg font-semibold tracking-tight">SEO expert in other cities</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/seo-expert-india/${o.slug}`}
                className="inline-flex items-center gap-1 rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
              >
                {o.city}
                <ArrowRight className="size-3" />
              </Link>
            ))}
            <Link
              href="/seo-expert-india"
              className="inline-flex items-center gap-1 rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
            >
              All of India
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
