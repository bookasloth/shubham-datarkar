import Link from "next/link";
import { ArrowRight, Check, X, Clock, IndianRupee } from "lucide-react";
import { site, socials } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { webDesignNagpur as c } from "@/lib/data/landing/web-design-nagpur";
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
  title: c.metaTitle, // "Web Developer & Design in Nagpur" — brand appended by root template
  description: c.metaDescription,
  path: c.path,
});

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${site.url}${c.path}#business`,
  name: "Web Developer & Design in Nagpur — Shubham Datarkar",
  description: c.metaDescription,
  url: `${site.url}${c.path}`,
  areaServed: [
    { "@type": "City", name: "Nagpur" },
    { "@type": "Country", name: "India" },
  ],
  serviceType: ["Web Development", "Web Design", "UI/UX Design", "E-commerce Development", "Web App Development"],
  priceRange: "₹₹",
  provider: {
    "@type": "Person",
    name: site.name,
    jobTitle: "Web Designer & Developer",
    url: site.url,
    address: { "@type": "PostalAddress", addressLocality: "Nagpur", addressRegion: "Maharashtra", addressCountry: "IN" },
    sameAs: socials.map((s) => s.href),
  },
};

export default function WebDeveloperNagpurPage() {
  return (
    <>
      <JsonLd
        data={[
          localBusinessSchema,
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Web Developer & Design in Nagpur", path: c.path },
          ]),
          faqSchema(c.faqs),
        ]}
      />

      {/* 1 — HERO */}
      <PageHero
        blueprint
        align="center"
        title={c.hero.h1}
        description={
          <>
            <span className="mb-6 flex flex-wrap justify-center gap-2">
              {c.hero.bullets.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm"
                >
                  <Check className="size-3.5 text-brand" /> {b}
                </span>
              ))}
            </span>
            <span className="mx-auto block max-w-2xl">{c.hero.paragraph}</span>
          </>
        }
        actions={
          <div className="flex w-full max-w-xs flex-col items-stretch gap-3">
            <LeadCtaButton className="w-full">{c.hero.cta}</LeadCtaButton>
            <Link href="#work" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
              See the work
              <ArrowRight />
            </Link>
          </div>
        }
      />

      <AnswerBlock text={c.answer} />

      {/* 2 — TRUST */}
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
          <div className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">{c.trust.heading}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{c.trust.paragraph}</p>
          </div>
        </Container>
      </Section>

      {/* 3 — SELECTED WORK (the real, live portfolio) */}
      <Section id="work" className="scroll-mt-20 py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Selected work</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Real, live sites — tap any card to open it.
          </p>
          {c.portfolio.map((group) => (
            <div key={group.key} className="mt-10 first:mt-8">
              <div className="flex items-baseline gap-3">
                <h3 className="text-xl font-bold tracking-tight">{group.label}</h3>
                <span className="font-display text-sm font-bold text-muted-foreground">{group.count}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{group.blurb}</p>
              <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <StaggerItem key={item.name}>
                    <WorkCard item={item} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ))}
        </Container>
      </Section>

      {/* 4 — WHY HIRE ME */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Why work with me</h2>
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

      {/* 5 — SERVICES */}
      <Section className="py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{c.services.heading}</h2>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.services.items.map((s) => (
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

      {/* 6 — PROBLEMS */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Is your website holding you back?
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

      {/* 7 — CONSULTATION */}
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

      {/* 8 — PROCESS */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">How a build runs</h2>
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

      {/* 9 — WHY WORK WITH ME */}
      <Section className="py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            More than a freelancer
          </h2>
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

      {/* 10 — INDUSTRIES */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Who I build for</h2>
          <p className="mt-4 text-2xl font-bold tracking-tight">{c.industries.heading}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {c.industries.items.map((ind) => (
              <span key={ind} className="rounded-btn border border-border bg-background px-3 py-1.5 text-sm font-medium">
                {ind}
              </span>
            ))}
          </div>
        </Container>
      </Section>

      {/* 11 — FAQ */}
      <Section className="py-16 md:py-20">
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

      {/* 12 — ABOUT */}
      <Section bleed className="border-y border-border bg-muted py-16 md:py-20">
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

      {/* 13 — FINAL CTA */}
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

      {/* Booking modal (design/build variant) + persistent CTA */}
      <LeadModal variant="webdev" />
      <StickyLeadCta />
    </>
  );
}
