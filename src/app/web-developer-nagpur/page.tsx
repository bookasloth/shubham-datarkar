import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site, socials, companies } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema, seoLandingSchema } from "@/lib/seo";
import { webDeveloperNagpur as c } from "@/lib/data/landing/web-developer-nagpur";
import { portfolio } from "@/lib/data/portfolio";
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
import { BentoCard } from "@/components/blueprint";
import { WorkCard } from "@/components/cards/work-card";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR — CDN-instant, refresh every 5 min

export const metadata = buildMetadata({
  title: c.metaTitle,
  description: c.metaDescription,
  path: c.path,
});

// Proof groups, in the order the content file asks for them. Missing keys are
// skipped rather than crashing, so editing portfolio.ts can never break the page.
const proofGroups = c.portfolioKeys
  .map((key) => portfolio.find((g) => g.key === key))
  .filter((g): g is NonNullable<typeof g> => Boolean(g));

export default function WebDeveloperNagpurPage() {
  return (
    <>
      <JsonLd
        data={[
          seoLandingSchema({
            path: c.path,
            name: "Web Developer in Nagpur",
            areaServed: { type: "City", name: "Nagpur" },
            offers: [],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: c.h1, path: c.path },
          ]),
          faqSchema(c.faqs),
        ]}
      />

      <PageHero
        blueprint
        eyebrow="Web Developer · Nagpur"
        title={c.h1}
        description={c.subhead}
        crumbs={[{ label: "Home", href: "/" }, { label: c.h1 }]}
        actions={
          <>
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
              <BrandIcon name="CalendarCheck" />
              Book a call
            </a>
            <Link href="#work" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See the work
              <ArrowRight />
            </Link>
          </>
        }
      />

      <AnswerBlock text={c.answer} />
      <TrustBar names={c.trustNames} />

      {/* Services */}
      <Section>
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            What I build
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

      {/* Proof — real portfolio, grouped by craft */}
      {proofGroups.length > 0 && (
        <Section id="work" className="scroll-mt-24 pt-0">
          <Container>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Selected work</h2>
            {proofGroups.map((group) => (
              <div key={group.key} className="mt-8 first:mt-6">
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
            <p className="mt-8 text-sm text-muted-foreground">
              This is a slice —{" "}
              <Link href="/work" className="font-medium text-foreground underline underline-offset-4">
                see everything I&rsquo;ve shipped
              </Link>
              .
            </p>
          </Container>
        </Section>
      )}

      {/* Process */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">How a build runs</h2>
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
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Why work with me</h2>
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

      {/* Who I build for */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Who I build for in Nagpur</h2>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.buyers.map((b) => (
              <StaggerItem key={b}>
                <BentoCard className="h-full" title={b} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Pricing note — no rupee figure: builds are scoped per project */}
      <Section className="pt-0">
        <Container>
          <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
            Websites and apps are scoped per project, not sold off a menu — a landing page, a full site, and a web app
            are very different jobs. Tell me what you need and you&rsquo;ll get a fixed price before anything starts.
          </p>
        </Container>
      </Section>

      {/* About */}
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
                  I&rsquo;m {site.name}, based in {site.location}. I&rsquo;ve shipped 20+ websites and 8+ software
                  products — including my own ventures, {companies.map((co) => co.name).join(", ")} — so the site I
                  build for you is built the same way I build the ones I bet my own business on.
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
            <Link href="/seo-expert-india/nagpur" className="hover:text-foreground">SEO Expert in Nagpur</Link>
            <Link href="/work" className="hover:text-foreground">All work</Link>
            <Link href="/services" className="hover:text-foreground">Services</Link>
            <Link href="/about" className="hover:text-foreground">About Shubham</Link>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">Last updated {c.updatedAt}</p>
        </Container>
      </Section>

      <CtaBand
        title="Need a website that actually brings in business?"
        description="Send a brief or book a call — I'll tell you honestly what your site needs, what it'll cost, and how fast it can ship."
      />
    </>
  );
}
