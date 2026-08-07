import Link from "next/link";
import { ArrowRight, Check, X, Clock, IndianRupee } from "lucide-react";
import { site, socials } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { seoExpertNagpur as c } from "@/lib/data/landing/seo-expert-nagpur";
import { portfolio } from "@/lib/data/portfolio";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { AnswerBlock } from "@/components/sections/answer-block";
import { WorkCard } from "@/components/cards/work-card";
import { LeadModal } from "@/components/lead-modal/lead-modal";
import { LeadCtaButton, StickyLeadCta } from "@/components/lead-modal/lead-cta";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR

export const metadata = buildMetadata({
  title: c.metaTitle, // "SEO Expert in Nagpur" — brand appended by root template
  description: c.metaDescription,
  path: c.path,
});

// Proof samples for the trust section — real content & campaign work.
const trustWork = ["ink-pad", "mark-eating"]
  .map((key) => portfolio.find((g) => g.key === key))
  .filter((g): g is NonNullable<typeof g> => Boolean(g))
  .flatMap((g) => g.items)
  .slice(0, 6);

// ProfessionalService + Person JSON-LD for local + entity relevance (AEO/GEO).
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${site.url}${c.path}#business`,
  name: "SEO Expert in Nagpur — Shubham Datarkar",
  description: c.metaDescription,
  url: `${site.url}${c.path}`,
  areaServed: [
    { "@type": "City", name: "Nagpur" },
    { "@type": "Country", name: "India" },
  ],
  serviceType: ["Search Engine Optimization", "Local SEO", "Technical SEO", "AI Search Optimization"],
  priceRange: "₹₹",
  provider: {
    "@type": "Person",
    name: site.name,
    jobTitle: "SEO Consultant",
    url: site.url,
    address: { "@type": "PostalAddress", addressLocality: "Nagpur", addressRegion: "Maharashtra", addressCountry: "IN" },
    sameAs: socials.map((s) => s.href),
  },
};

export default function SeoExpertInNagpurPage() {
  return (
    <>
      <JsonLd
        data={[
          localBusinessSchema,
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "SEO Expert in Nagpur", path: c.path },
          ]),
          faqSchema(c.faqs),
        ]}
      />

      {/* 1 — HERO */}
      <PageHero
        blueprint
        align="center"
        eyebrow="SEO Expert · Nagpur"
        title={c.hero.h1}
        description={
          <>
            <span className="mb-5 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-6">
              {c.hero.bullets.map((b) => (
                <span key={b} className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                  <Check className="size-4 text-brand" /> {b}
                </span>
              ))}
            </span>
            <span className="mx-auto block max-w-2xl">{c.hero.paragraph}</span>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "SEO Expert in Nagpur" }]}
        actions={
          <>
            <LeadCtaButton>{c.hero.cta}</LeadCtaButton>
            <Link href="#case-studies" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See results
              <ArrowRight />
            </Link>
          </>
        }
      />

      <AnswerBlock text={c.answer} />

      {/* 2 — TRUST & CREDIBILITY */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-4">
            {c.trust.stats.map((s) => (
              <div key={s.label} className="bg-card p-6 text-center">
                <div className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Trusted by growing businesses
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {c.trust.names.map((n) => (
              <li key={n} className="text-sm font-medium text-foreground/70">
                {n}
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">{c.trust.heading}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{c.trust.paragraph}</p>
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trustWork.map((item) => (
                <StaggerItem key={item.name}>
                  <WorkCard item={item} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Container>
      </Section>

      {/* 3 — WHY BUSINESSES HIRE ME */}
      <Section className="py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Why businesses hire me
          </h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight">{c.whyHire.heading}</p>
              <p className="mt-4 text-muted-foreground">{c.whyHire.paragraph}</p>
            </div>
            <Stagger className="grid gap-3 sm:grid-cols-2">
              {c.whyHire.points.map((p) => (
                <StaggerItem key={p}>
                  <div className="flex items-start gap-3 rounded-input border border-border bg-card p-4">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span className="text-sm font-medium">{p}</span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Container>
      </Section>

      {/* 4 — PROBLEMS YOU SOLVE */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Is your website facing these problems?
          </h2>
          <div className="mt-4 max-w-2xl">
            <p className="text-2xl font-bold tracking-tight">{c.problems.heading}</p>
            <p className="mt-4 text-muted-foreground">{c.problems.paragraph}</p>
          </div>
          <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.problems.items.map((p) => (
              <StaggerItem key={p}>
                <div className="flex items-start gap-3 rounded-input border border-border bg-background p-4">
                  <X className="mt-0.5 size-4 shrink-0 text-danger" />
                  <span className="text-sm">{p}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-8">
            <LeadCtaButton>{c.problems.cta}</LeadCtaButton>
          </div>
        </Container>
      </Section>

      {/* 5 — WHAT HAPPENS DURING THE CONSULTATION */}
      <Section className="py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            What happens during the consultation?
          </h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight">{c.consultation.heading}</p>
              <p className="mt-4 text-muted-foreground">{c.consultation.paragraph}</p>
              <Stagger className="mt-6 grid gap-3 sm:grid-cols-2">
                {c.consultation.covers.map((item) => (
                  <StaggerItem key={item}>
                    <div className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span>{item}</span>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
            <Card className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-input border border-border p-4">
                  <Clock className="size-5 text-muted-foreground" />
                  <div className="mt-3 font-display text-xl font-extrabold tracking-tight">{c.consultation.duration}</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="rounded-input border border-border p-4">
                  <IndianRupee className="size-5 text-muted-foreground" />
                  <div className="mt-3 font-display text-xl font-extrabold tracking-tight">{c.consultation.cost}</div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                </div>
              </div>
              <LeadCtaButton className="mt-5 w-full">{c.consultation.cta}</LeadCtaButton>
              <p className="mt-3 text-center text-xs text-muted-foreground">No obligation. No sales pitch.</p>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 6 — SEO PROCESS */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">My SEO process</h2>
          <p className="mt-4 text-2xl font-bold tracking-tight">{c.process.heading}</p>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.process.steps.map((p, i) => (
              <StaggerItem key={p.step}>
                <Card className="h-full p-6">
                  <span className="font-display text-sm font-bold text-brand">Step {i + 1}</span>
                  <h3 className="mt-2 font-semibold">{p.step}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 7 — WHY WORK WITH ME */}
      <Section className="py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Why work with me?</h2>
          <p className="mt-4 text-2xl font-bold tracking-tight">{c.whyWork.heading}</p>
          <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.whyWork.features.map((f) => (
              <StaggerItem key={f}>
                <div className="flex h-full items-start gap-3 rounded-input border border-border bg-card p-4">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span className="text-sm font-medium">{f}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 8 — INDUSTRIES */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Industries I work with
          </h2>
          <p className="mt-4 text-2xl font-bold tracking-tight">{c.industries.heading}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {c.industries.items.map((ind) => (
              <span key={ind} className="rounded-btn border border-border px-3 py-1.5 text-sm font-medium">
                {ind}
              </span>
            ))}
          </div>
        </Container>
      </Section>

      {/* 9 — CASE STUDIES */}
      <Section id="case-studies" className="scroll-mt-20 py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Client success stories
          </h2>
          <p className="mt-4 text-2xl font-bold tracking-tight">{c.caseStudies.heading}</p>
          <Stagger className="mt-8 grid gap-4 md:grid-cols-3">
            {c.caseStudies.items.map((cs) => (
              <StaggerItem key={cs.client}>
                <Card className="flex h-full flex-col p-6">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{cs.sector}</span>
                  <h3 className="mt-2 text-lg font-bold tracking-tight">{cs.client}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{cs.result}</p>
                  {cs.slug && (
                    <Link
                      href={`/case-studies/${cs.slug}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand transition-ui hover:underline"
                    >
                      Read the case study <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
          <Link href="/case-studies" className={cn(buttonVariants({ variant: "outline" }), "mt-8")}>
            {c.caseStudies.cta}
            <ArrowRight />
          </Link>
        </Container>
      </Section>

      {/* 10 — FAQ */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="mt-4">
            {c.faqs.map((f) => (
              <AccordionItem key={f.question} value={f.question}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      {/* 11 — ABOUT */}
      <Section className="py-16 md:py-20">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <Avatar className="size-20">
                <AvatarFallback className="text-xl font-bold">{site.shortName}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {c.about.heading}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{c.about.paragraph}</p>
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
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* 12 — FINAL CTA */}
      <Section className="py-16 md:py-20">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-card bg-foreground px-6 py-14 text-center text-background md:px-14 md:py-20">
              <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-background md:text-4xl">{c.finalCta.heading}</h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-background/70 md:text-lg">{c.finalCta.paragraph}</p>
                <div className="mt-8 flex justify-center">
                  <LeadCtaButton variant="secondary">{c.finalCta.cta}</LeadCtaButton>
                </div>
              </div>
            </div>
          </Reveal>
          <p className="mt-6 text-center text-xs text-muted-foreground">Last updated {c.updatedAt}</p>
        </Container>
      </Section>

      {/* Booking modal + persistent CTA */}
      <LeadModal />
      <StickyLeadCta />
    </>
  );
}
