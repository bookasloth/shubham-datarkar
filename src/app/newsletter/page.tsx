import { ArrowUpRight, Check, X } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import {
  newsletterMeta,
  whatYoullReceive,
  issueQualities,
  sampleIssues,
  whoFor,
  whatItsNot,
  readerQuotes,
} from "@/lib/data/newsletter";
import { Container, Section } from "@/components/layout/container";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Stagger, StaggerItem, Reveal } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "The Builders List Newsletter",
  description: "A fortnightly newsletter on marketing systems, product thinking, and AI leverage. Frameworks that compound — no trends, no noise, no recycled threads.",
  ogTitle: "The Builders List — frameworks that compound",
  ogDescription: "No trends. No recycled threads. Just the working notes behind marketing systems that actually ship. One email per fortnight.",
  path: "/newsletter",
});

export default function NewsletterPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Newsletter", path: "/newsletter" }])} />

      {/* Hero */}
      <Section bleed className="relative overflow-hidden border-b border-border">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" aria-hidden />
        <Container size="narrow" className="relative py-16 text-center md:py-24">
          <Reveal>
            <Badge variant="outline" className="mb-6">{newsletterMeta.cadence}</Badge>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl">Join the Builders List</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {newsletterMeta.promise} Every 2nd week, I share structured insights on marketing systems, product
              thinking, digital leverage, and execution discipline.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium">No trends. No noise. No recycled threads. Just frameworks that compound.</p>
          </Reveal>
          <Reveal delay={0.2}>
            <NewsletterForm variant="inline" className="mx-auto mt-7 max-w-md" />
            <p className="mt-3 text-xs text-muted-foreground">One email per fortnight. Unsubscribe anytime.</p>
          </Reveal>
        </Container>
      </Section>

      {/* What you'll receive */}
      <Section>
        <Container size="narrow">
          <SectionHeading
            eyebrow="What you'll receive"
            title="This isn't commentary. It's working notes."
          />
          <Stagger className="mt-8 flex flex-col gap-3">
            {whatYoullReceive.map((item) => (
              <StaggerItem key={item}>
                <div className="flex items-start gap-3 rounded-card border border-border p-4">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3" />
                  </span>
                  <span className="text-[15px]">{item}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-8 flex flex-wrap gap-2">
            {issueQualities.map((q) => (
              <Badge key={q} variant="muted">{q}</Badge>
            ))}
          </div>
        </Container>
      </Section>

      {/* Sample issues */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container size="narrow">
          <SectionHeading eyebrow="Sample issues" title="What recent editions looked like" />
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
            {sampleIssues.map((issue) => (
              <StaggerItem key={issue.no}>
                <Card interactive className="group flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-muted-foreground">Issue #{issue.no}</span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug">{issue.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{issue.summary}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Who it's for / what it's not */}
      <Section>
        <Container size="narrow">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Who this is for</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {whoFor.map((w) => (
                  <li key={w} className="flex items-start gap-3 text-[15px]">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">If you value clarity over chaos, this will resonate.</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">What it&rsquo;s not</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {whatItsNot.map((w) => (
                  <li key={w} className="flex items-start gap-3 text-[15px] text-muted-foreground">
                    <X className="mt-0.5 size-4 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">This is deliberate thinking.</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Reader quotes */}
      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading eyebrow="What readers say" title="From the inbox" align="center" />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {readerQuotes.map((r) => (
              <StaggerItem key={r.name}>
                <Card className="flex h-full flex-col p-6">
                  <p className="flex-1 text-[15px] leading-relaxed">&ldquo;{r.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">{r.initials}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-muted-foreground">{r.role}</div>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Why I write + final call */}
      <Section>
        <Container size="narrow">
          <SectionHeading eyebrow="Why I write this" title="A structured notebook, refined before it reaches you" />
          <div className="mt-6 flex flex-col gap-4 text-[17px] leading-8 text-foreground/90">
            <p>Writing sharpens thinking. Publishing builds accountability. Sharing builds network effects.</p>
            <p>If you&rsquo;re building something that matters, you&rsquo;ll find value here.</p>
          </div>

          <Reveal className="mt-12">
            <div className="rounded-card border border-border bg-card p-8 text-center md:p-12">
              <h2 className="text-2xl font-bold tracking-tight">Every fortnight. One email. Built to respect your time.</h2>
              <NewsletterForm variant="inline" className="mx-auto mt-6 max-w-md" />
              <p className="mt-3 text-xs text-muted-foreground">{newsletterMeta.subscriberClaim}. No pressure — leave anytime.</p>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
