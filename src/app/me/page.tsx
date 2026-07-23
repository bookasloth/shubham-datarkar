import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";

import { site } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";
import { platforms } from "@/lib/data/platforms";
import { getPublishedPosts } from "@/lib/blog/queries";
import { stats, capabilities } from "@/lib/data/site-content";

import { Container, Section } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/lib/icons";
import { ClientsMarquee } from "@/components/sections/clients-marquee";
import { ToolStackGrid } from "@/components/sections/tool-stack-grid";
import { StatGrid } from "@/components/sections/stat-grid";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { CtaBand } from "@/components/sections/cta-band";
import { PlatformCard } from "@/components/cards/platform-card";
import { PostCard } from "@/components/cards/post-card";
import { cn } from "@/lib/utils";

// /me is the build-in-public / personal hub — deliberately distinct from the
// buyer home at `/` (which sells SEO/AEO work). This page is the journey: what
// I'm building, what I'm writing, the stack, and the numbers — not a second
// pitch page. Keeping the intent separate avoids the two homepages cannibalizing
// each other on "Shubham Datarkar".
export const metadata = buildMetadata({
  title: "Building in Public",
  description:
    "The build-in-public side of Shubham Datarkar — the products I'm shipping, the essays and playbooks I'm writing, the stack I use, and the numbers behind it. Documented in the open.",
  ogTitle: "Building in Public",
  ogDescription:
    "What I'm building, writing, and learning — documented in the open. Products, essays, tools, and the numbers behind them.",
  path: "/me",
});

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-ui hover:gap-2">
      {label}
      <ArrowRight className="size-4" />
    </Link>
  );
}

// Live threads of the build — each links to a real, already-shipped area.
const currently = [
  { href: "/projects", label: "Projects", detail: "The products, platforms, and communities I'm building right now." },
  { href: "/now", label: "Now", detail: "What I'm focused on this month — the short version." },
  { href: "/roadmap", label: "Roadmap", detail: "What's shipped, what's next, and what changed." },
];

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

export default async function BuildingInPublicPage() {
  const allPosts = await getPublishedPosts();
  // Writing rail: lead with one featured post, then fill with the most recent —
  // 3 total. allPosts is newest-first, so the recent slice is just the top rows
  // minus whatever's already featured. Falls back to 3 recent if none featured.
  const featuredPost = allPosts.find((p) => p.featured);
  const recentPosts = allPosts.filter((p) => p.slug !== featuredPost?.slug).slice(0, featuredPost ? 2 : 3);
  const homePosts = featuredPost ? [featuredPost, ...recentPosts] : recentPosts;
  return (
    <>
      {/* 1 — Hero */}
      <Section bleed className="relative overflow-hidden border-b border-border">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" aria-hidden />
        <Container className="relative py-24 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            <Reveal>
              <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                Everything I&rsquo;m building, out loud.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                I&rsquo;m Shubham Datarkar. This is the build-in-public side of the work — the products I&rsquo;m shipping,
                the essays and playbooks I write while doing it, and the stack and numbers behind it all. Less pitch,
                more receipts.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-4 text-sm text-muted-foreground">
                Looking to work together?{" "}
                <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Start here
                </Link>
                .
              </p>
            </Reveal>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/newsletter" className={cn(buttonVariants({ size: "lg" }))}>
                Join the Builders List
                <ArrowRight />
              </Link>
              <Link href="/community" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Visit the community
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

      {/* 3 — Currently building */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Currently"
            title="What I'm building right now"
            description="The live threads. Each of these is a real, in-progress area — follow whichever one you care about."
          />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
            {currently.map((c) => (
              <StaggerItem key={c.href}>
                <Link href={c.href} className="group block h-full">
                  <Card interactive className="flex h-full flex-col p-6">
                    <h3 className="flex items-center gap-1 text-lg font-semibold tracking-tight">
                      {c.label}
                      <ArrowRight className="size-4 text-muted-foreground transition-ui group-hover:translate-x-0.5" />
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.detail}</p>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* 4 — Platforms & Products */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
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

      {/* 5 — What I build */}
      <Section>
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
            {homePosts.map((p) => (
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

      {/* 8 — Booking */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
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
                  <BrandIcon name="CalendarCheck" />
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

      {/* 9 — Stats + newsletter */}
      <Section>
        <Container>
          <StatGrid stats={stats} />
          <Reveal className="mt-16">
            <div className="mx-auto max-w-2xl rounded-card border border-border bg-card p-8 text-center md:p-12">
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
