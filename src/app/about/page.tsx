import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site, companies } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, profilePageSchema } from "@/lib/seo";
import { principles, stats } from "@/lib/data/site-content";
import { experience } from "@/lib/data/experience";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/layout/section-heading";
import { StatGrid } from "@/components/sections/stat-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "About",
  description:
    "Shubham Datarkar — founder of three companies, operating at the intersection of marketing, product, and AI. The story, the principles, and the receipts.",
  path: "/about",
  type: "profile",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          profilePageSchema(),
          breadcrumbSchema([{ name: "Home", path: "/" }, { name: "About", path: "/about" }]),
        ]}
      />
      <PageHero
        eyebrow="About"
        title="Marketer who builds. Builder who markets."
        description="I'm Shubham Datarkar — The Kalamwala. I write the copy, run the marketing, and build the software — across a creative studio, a booking SaaS, and my own internet company."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        actions={
          <>
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
              <BrandIcon name="CalendarCheck" />
              Book a call
            </a>
            <Link href="/work" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See my work
              <ArrowRight />
            </Link>
            <Link href="/my-story" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
              Read my story
            </Link>
          </>
        }
      />

      {/* Story */}
      <Section>
        <Container size="narrow">
          <Reveal className="flex flex-col gap-6 text-[17px] leading-8 text-foreground/90">
            <p>
              I build things that make other things easier — sometimes an ad, sometimes a brand, sometimes entire
              software. I write the copy, architect the SEO, build the product, and run the campaigns. I don’t fit a
              single category. That’s the point.
            </p>
            <p>
              The thesis is simple. Most marketers can’t build, so they’re at the mercy of engineers. Most builders
              can’t market, so they ship into silence. The leverage is in being both — and wiring AI underneath so one
              operator can do the work of a team without burning out.
            </p>
            <p>
              Three companies, two domains, one operating philosophy:{" "}
              <em className="font-medium text-foreground">systems over hustle, compounding over campaigns, and ownership over employment.</em>
            </p>
          </Reveal>
        </Container>
      </Section>

      {/* Numbers */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading eyebrow="The receipts" title="Numbers, not adjectives" />
          <div className="mt-10">
            <StatGrid stats={stats} />
          </div>
        </Container>
      </Section>

      {/* Experience */}
      <Section>
        <Container size="narrow">
          <SectionHeading eyebrow="The journey" title="Where I've worked" description="Nearly a decade across copy, content, growth, and code — from farm to founder." />
          <Stagger className="mt-10 flex flex-col">
            {experience.map((e) => (
              <StaggerItem key={`${e.company}-${e.period}`}>
                <div className="grid gap-1 border-b border-border py-6 last:border-0 sm:grid-cols-[190px_1fr] sm:gap-6">
                  <div className="text-sm font-medium text-muted-foreground">{e.period}</div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="font-semibold">{e.role}</h3>
                      <span className="text-sm text-muted-foreground">· {e.company}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.detail}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Companies */}
      <Section bleed id="companies" className="scroll-mt-24 border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading eyebrow="The companies" title="Three operating businesses" />
          <Stagger className="mt-10 grid gap-4 md:grid-cols-3">
            {companies.map((co) => (
              <StaggerItem key={co.name}>
                <Card className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold">{co.since}</span>
                    <Badge variant={co.status === "Active" ? "success" : "muted"}>{co.status}</Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{co.name}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{co.kind}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{co.blurb}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Principles */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Operating principles"
            title="How I make decisions"
            description="The mental models behind every business I build. There's a deeper page on this if you want it."
          />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p) => (
              <StaggerItem key={p.title}>
                <Card className="h-full p-6">
                  <h3 className="text-base font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-8">
            <Link href="/philosophy" className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2">
              Read the full philosophy
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </Section>

      <CtaBand title="Want this kind of thinking on your problem?" />
    </>
  );
}
