import Link from "next/link";
import { ArrowRight, CalendarCheck, Check } from "lucide-react";

import { site } from "@/lib/site";
import { buildMetadata, organizationSchema } from "@/lib/seo";
import { platforms } from "@/lib/data/platforms";
import { featuredCaseStudies } from "@/lib/data/case-studies";
import { featuredPosts } from "@/lib/data/posts";
import { testimonials } from "@/lib/data/testimonials";
import { stats, capabilities } from "@/lib/data/site-content";

import { Container, Section } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/lib/icons";
import { JsonLd } from "@/components/seo/json-ld";
import { Marquee } from "@/components/sections/marquee";
import { ClientsMarquee } from "@/components/sections/clients-marquee";
import { ToolStackGrid } from "@/components/sections/tool-stack-grid";
import { StatGrid } from "@/components/sections/stat-grid";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { CtaBand } from "@/components/sections/cta-band";
import { PlatformCard } from "@/components/cards/platform-card";
import { CaseStudyCard } from "@/components/cards/case-study-card";
import { PostCard } from "@/components/cards/post-card";
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

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />

      {/* 1 — Hero */}
      <Section bleed className="relative overflow-hidden border-b border-border">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" aria-hidden />
        <Container className="relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Badge variant="outline">
                  <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
                  Available for Hire
                </Badge>
                <span className="text-sm text-muted-foreground">{site.location}</span>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                I build growth systems for startups that are just getting started.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                I&rsquo;m Shubham Datarkar — developer, digital strategist, storyteller &amp; builder. I focus on how
                brands communicate clearly, convert intentionally, and build structures that compound over time. This
                space documents my thinking, frameworks, tools, and lessons from building in public.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-4 text-sm text-muted-foreground">If you value clarity over noise, we&rsquo;ll work well together.</p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
                  <CalendarCheck />
                  Book a discovery call
                </a>
                <Link href="/work" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                  See my work
                  <ArrowRight />
                </Link>
              </div>
            </Reveal>
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

      {/* 3 — Platforms & Products */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Platforms & products"
            title="A few experiments that became companies"
            description="The agencies, products, and platforms I'm building — each its own world, all part of the same operating philosophy."
          />
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((p) => (
              <StaggerItem key={p.name}>
                <PlatformCard platform={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 4 — What I build */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading
            eyebrow="What I do"
            title="Clarity, conversion, and compounding structure"
            description="Most marketers can't build. Most builders can't market. The work below is what happens when you refuse to choose."
          />
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <StaggerItem key={c.title}>
                <Card className="flex h-full flex-col p-6">
                  <div className="flex size-11 items-center justify-center rounded-card bg-muted text-foreground">
                    <Icon name={c.icon} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 5 — Selected work */}
      <Section>
        <Container>
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Cases"
              title="Selected work"
              description="A look at the systems behind the outcomes. Load more when depth matters."
            />
            <div className="hidden sm:block">
              <ViewAll href="/case-studies" label="All cases" />
            </div>
          </div>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
            {featuredCaseStudies.map((c) => (
              <StaggerItem key={c.slug}>
                <CaseStudyCard study={c} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 6 — Writing */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <SectionHeading eyebrow="Essays & notes" title="Thinking, in public" />
            <div className="hidden sm:block">
              <ViewAll href="/blog" label="Read the blog" />
            </div>
          </div>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
            {featuredPosts.map((p) => (
              <StaggerItem key={p.slug}>
                <PostCard post={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 7 — Tool stack */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Stack"
            title="Tools I build with"
            description="The boring, deliberate toolkit behind the work — from analytics to acquisition to actual code."
          />
          <div className="mt-12">
            <ToolStackGrid />
          </div>
        </Container>
      </Section>

      {/* 8 — Testimonials */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container className="mb-10">
          <SectionHeading eyebrow="Vouch for the cat" title="What it's like to work together" align="center" />
        </Container>
        <Marquee duration={48}>
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} testimonial={t} className="w-[340px] shrink-0" />
          ))}
        </Marquee>
      </Section>

      {/* 9 — Booking */}
      <Section>
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div>
                <SectionHeading
                  eyebrow="Frictionless"
                  title="Book a discovery call"
                  description="No forms, no back-and-forth. Pick a slot and we'll talk through your growth, product, or positioning problem — and leave with a clear next step."
                />
                <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
                  <CalendarCheck />
                  Open the calendar
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="p-6">
                <ul className="flex flex-col gap-4">
                  {[
                    "A focused 30 minutes on your specific problem",
                    "Straight answers — no pitch deck, no fluff",
                    "At least one concrete, actionable next step",
                    "Booked through Book A Sloth — instant confirmation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="size-3" />
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

      {/* 10 — Stats + newsletter */}
      <Section bleed className="border-t border-border bg-card py-16 md:py-24">
        <Container>
          <StatGrid stats={stats} />
          <Reveal className="mt-16">
            <div className="mx-auto max-w-2xl rounded-card border border-border bg-background p-8 text-center md:p-12">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Join the Builders List</h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Clear thinking for people building real things. Frameworks that compound — one email per fortnight.
              </p>
              <NewsletterForm variant="inline" className="mx-auto mt-6 max-w-md" />
              <p className="mt-3 text-xs text-muted-foreground">
                <Link href="/newsletter" className="underline-offset-4 hover:underline">
                  See what&rsquo;s inside
                </Link>
              </p>
            </div>
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
