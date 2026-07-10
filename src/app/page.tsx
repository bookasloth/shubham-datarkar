import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { buildMetadata, organizationSchema } from "@/lib/seo";
import type { Service, CaseStudy, Testimonial } from "@/lib/data/types";
import { getPublishedEntities } from "@/lib/content/queries";

import { Container, Section } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";
import { ClientsMarquee } from "@/components/sections/clients-marquee";
import { CtaBand } from "@/components/sections/cta-band";
import { ServiceCard } from "@/components/cards/service-card";
import { CaseStudyCard } from "@/components/cards/case-study-card";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({ path: "/" });

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-ui hover:gap-2">
      {label}
      <ArrowRight className="size-4" />
    </Link>
  );
}

// Services to feature, in this exact order. AEO/GEO (seo) leads. Selected by slug —
// the DB order is by `sort`, so slicing the array would surface the wrong ones.
const SERVICE_SLUGS = ["seo", "content", "advisory"];

// Slug-preferred, not `featured`-filtered. The seed's featured flags include a
// cost-per-install gaming case, which reads as incoherent under an AI-citation
// headline. Occasion Cakes is search-visibility proof; Stone & Acres is
// qualified-visit proof.
const CASE_SLUGS = ["occasion-cakes-local-seo", "stone-and-acres-land-stories"];

// Copied literally from src/app/services/page.tsx — a page module is not a data
// module, so importing it across routes would be a defect.
const how = [
  { step: "Audit", detail: "Understand the business and find what's actually winnable." },
  { step: "Design", detail: "Design the mechanism that will compound — not a campaign." },
  { step: "Build", detail: "Ship it, hands-on, with quality gates at every step." },
  { step: "Compound", detail: "Instrument it, hand it over, and let it run without me." },
];

const forYou = [
  "0–10 Cr ARR SaaS, agencies, and growth-stage startups in India",
  "You have a product and customers — visibility is the constraint",
  "You want a system that compounds, not a campaign that spikes",
];

const notForYou = [
  "Pre-revenue and pre-product",
  "One-off campaigns or a single landing page",
  "Anyone shopping on price alone",
];

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

export default async function HomePage() {
  // Fire all three reads in parallel — they're independent, so serial awaits
  // just stack their latencies onto TTFB.
  const [allServices, allCaseStudies, testimonials] = await Promise.all([
    getPublishedEntities<Service>("services"),
    getPublishedEntities<CaseStudy>("case_studies"),
    getPublishedEntities<Testimonial>("testimonials"),
  ]);

  const homeServices = SERVICE_SLUGS
    .map((slug) => allServices.find((s) => s.slug === slug))
    .filter((s): s is Service => Boolean(s));

  const preferred = CASE_SLUGS
    .map((slug) => allCaseStudies.find((c) => c.slug === slug))
    .filter((c): c is CaseStudy => Boolean(c));
  const homeCases = preferred.length === CASE_SLUGS.length
    ? preferred
    : allCaseStudies.filter((c) => c.featured).slice(0, 2);

  return (
    <>
      <JsonLd data={organizationSchema()} />

      {/* 1 — Hero */}
      <Section bleed className="relative overflow-hidden border-b border-border">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" aria-hidden />
        <Container className="relative py-24 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            <Reveal>
              <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                Get your brand cited by AI.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                When a founder asks ChatGPT who to hire, you are either the answer or you are invisible. I make
                0–10 Cr companies the answer — through AEO, GEO, and the SEO underneath it.
              </p>
            </Reveal>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/contact" className={cn(buttonVariants({ size: "lg" }))}>
                Start a conversation
                <ArrowRight />
              </Link>
              <Link href="/case-studies" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                See the work
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* 2 — Brands worked with */}
      <Section bleed className="border-b border-border bg-card py-12">
        <Container>
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Brands I&rsquo;ve worked with
          </p>
          <ClientsMarquee />
        </Container>
      </Section>

      {/* 3 — Who this is for / who this isn't for */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Fit"
            title="Who this is for — and who it isn't"
            description="The work compounds for a specific kind of company. If that isn't you, better to know now than after a kickoff call."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <Reveal>
              <Card className="flex h-full flex-col p-6 md:p-8">
                <h3 className="text-lg font-semibold tracking-tight">This is for you if</h3>
                <ul className="mt-5 flex flex-col gap-4">
                  {forYou.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="size-3" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="flex h-full flex-col p-6 md:p-8">
                <h3 className="text-lg font-semibold tracking-tight text-muted-foreground">This isn&rsquo;t for you if</h3>
                <ul className="mt-5 flex flex-col gap-4">
                  {notForYou.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border">
                        <X className="size-3" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* 4 — Services with prices */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Services"
              title="Three ways to become the answer"
              description="Productized engagements with clear outcomes and clear prices. No retainer mystery."
            />
            <div className="hidden sm:block">
              <ViewAll href="/services" label="All services" />
            </div>
          </div>
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeServices.map((s) => (
              <StaggerItem key={s.slug}>
                <ServiceCard service={s} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 5 — Case studies */}
      <Section>
        <Container>
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Proof"
              title="Numbers, not adjectives"
              description="Two systems and what they moved. The full write-ups show the mechanism behind each result."
            />
            <div className="hidden sm:block">
              <ViewAll href="/case-studies" label="All cases" />
            </div>
          </div>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-2">
            {homeCases.map((c) => (
              <StaggerItem key={c.slug}>
                <CaseStudyCard study={c} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 6 — How it works */}
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

      {/* 7 — Testimonials (static grid — proof must sit still) */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Vouch for the cat" title="What it's like to work together" align="center" />
          <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <StaggerItem key={t.name}>
                <TestimonialCard testimonial={t} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 8 — Who is Shubham */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading eyebrow="Who's behind this" title="Shubham Datarkar" align="center" />
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              I&rsquo;m Shubham Datarkar — developer, marketer, and the founder behind The Bogus Company, Book A
              Sloth, and Timewheel Internet. I build the systems I write about, which is the only reason the advice
              survives contact with reality.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/me" className={cn(buttonVariants({ variant: "outline" }))}>
                More about me
                <ArrowRight />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* 9 — CTA band (defaults: booking calendar + /contact) */}
      <CtaBand
        title="Be the name AI recommends."
        description="When your next customer asks an AI who to hire, the answer should be you. Let's build the visibility that gets you cited."
      />
    </>
  );
}
