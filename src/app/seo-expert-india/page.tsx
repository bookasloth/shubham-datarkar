import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site, socials, companies } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema, reviewSchema, seoLandingSchema } from "@/lib/seo";
import type { CaseStudy, Testimonial } from "@/lib/data/types";
import { getPublishedEntities } from "@/lib/content/queries";
import { seoExpertIndia as c } from "@/lib/data/landing/seo-expert-india";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { CtaBand } from "@/components/sections/cta-band";
import { AnswerBlock } from "@/components/sections/answer-block";
import { TrustBar } from "@/components/sections/trust-bar";
import { PricingTiers } from "@/components/sections/pricing-tiers";
import { CaseStudyCard } from "@/components/cards/case-study-card";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR — CDN-instant, refresh every 5 min

export const metadata = buildMetadata({
  title: c.metaTitle, // "SEO Expert in India: Services & Pricing" (brand appended by root template)
  description: c.metaDescription,
  path: c.path,
});

export default async function SeoExpertIndiaPage() {
  const [caseStudies, testimonials] = await Promise.all([
    getPublishedEntities<CaseStudy>("case_studies"),
    getPublishedEntities<Testimonial>("testimonials"),
  ]);
  // Intentional: no fallback to `featured` if none of caseStudySlugs match —
  // an empty Results section is correct here, not a bug to "fix" with fabricated proof.
  const seoCases = (c.caseStudySlugs?.length
    ? caseStudies.filter((cs) => c.caseStudySlugs!.includes(cs.slug))
    : caseStudies.filter((cs) => cs.featured)
  ).slice(0, 3);
  const shownTestimonials = testimonials.slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          seoLandingSchema({
            path: c.path,
            name: "SEO Expert Services in India",
            areaServed: { type: c.areaServedType, name: c.areaName },
            offers: c.pricingTiers.map((t) => ({ name: t.name, price: t.price, description: t.features.join(", ") })),
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: c.h1, path: c.path },
          ]),
          faqSchema(c.faqs),
          ...reviewSchema(shownTestimonials),
        ]}
      />
      <PageHero
        blueprint
        eyebrow="SEO Expert"
        title={c.h1}
        description={c.subhead}
        crumbs={[{ label: "Home", href: "/" }, { label: c.h1 }]}
        actions={
          <>
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
              <BrandIcon name="CalendarCheck" />
              Book a call
            </a>
            <Link href="#pricing" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See pricing
              <ArrowRight />
            </Link>
          </>
        }
      />

      <AnswerBlock text={c.answer} />
      <TrustBar names={c.trustNames} />

      {/* Services grid */}
      <Section>
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            What an SEO expert does
          </h2>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2">
            {c.serviceBlocks.map((s) => (
              <StaggerItem key={s.h3}>
                <Card className="h-full p-6">
                  <h3 className="font-semibold">{s.h3}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.definition}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Proof — nothing renders if there are no matching published case studies */}
      {seoCases.length > 0 && (
        <Section className="pt-0">
          <Container>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Results</h2>
            <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seoCases.map((cs) => (
                <StaggerItem key={cs.slug}>
                  <CaseStudyCard study={cs} />
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      )}

      {/* Process */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">The process</h2>
          <ol className="mt-6 flex max-w-2xl flex-col gap-4">
            {c.process.map((p, i) => (
              <li key={p.step} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-xs font-bold text-background">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{p.step}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Why work with me */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Why work with me
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.differentiators.map((d) => (
              <Card key={d.label} className="p-6">
                <div className="font-display text-2xl font-extrabold tracking-tight">{d.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{d.label}</div>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <PricingTiers tiers={c.pricingTiers} />

      {/* Reconciles this page's fixed-scope packages with the custom retainer
          priced on /services/seo, so the two SEO prices don't read as a
          contradiction. Link only — no rupee figure duplicated (avoids drift). */}
      <Section className="pt-0">
        <Container>
          <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
            These are fixed-scope monthly packages. For custom or larger-scale SEO programmes, I also run
            retainer engagements — see the{" "}
            <Link href="/services/seo" className="font-medium text-foreground underline underline-offset-4">
              full SEO service
            </Link>
            .
          </p>
        </Container>
      </Section>

      {/* About — no real headshot asset exists yet, so this degrades to an
          initials avatar (same principle as TrustBar's text-only fallback)
          instead of a broken <img>. No Person JSON-LD here: it's already
          emitted once, globally, by the root layout. */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <Avatar className="size-20">
                <AvatarFallback className="text-xl font-bold">{site.shortName}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Who you&rsquo;re working with
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                  I&rsquo;m {site.name} — {site.role.toLowerCase()}, based in {site.location}. I run SEO and growth
                  across my own businesses — {companies.map((co) => co.name).join(", ")} — which means the playbook
                  on this page is the same one I use in practice, not a repackaged template.
                </p>
              </div>
              <ul className="flex flex-wrap items-center justify-center gap-4">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-muted-foreground transition-ui hover:text-foreground"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link href="/about" className={cn(buttonVariants({ variant: "outline" }))}>
                More about me
                <ArrowRight />
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Testimonials — nothing renders if there are no published testimonials */}
      {shownTestimonials.length > 0 && (
        <Section>
          <Container>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              What clients say
            </h2>
            <Stagger className="mt-6 grid gap-4 md:grid-cols-3">
              {shownTestimonials.map((t) => (
                <StaggerItem key={t.name}>
                  <TestimonialCard testimonial={t} className="h-full" />
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      )}

      {/* FAQ */}
      <Section>
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">FAQ</h2>
          <Accordion type="single" collapsible className="mt-2">
            {c.faqs.map((f) => (
              <AccordionItem key={f.question} value={f.question}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      {/* Internal links */}
      <Section className="py-8">
        <Container>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/services/seo" className="hover:text-foreground">SEO service</Link>
            <Link href="/case-studies" className="hover:text-foreground">Case studies</Link>
            <Link href="/about" className="hover:text-foreground">About Shubham</Link>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">Last updated {c.updatedAt}</p>
        </Container>
      </Section>

      <CtaBand
        title="Ready to grow your organic traffic?"
        description="Book a call or send a brief — I'll tell you honestly what SEO can do for your business and how fast."
      />
    </>
  );
}
