import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { press } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Speaking",
  description: "Keynotes and workshops on SEO, AI workflows, and founder-led growth — built on real experiments, not theory.",
  path: "/speaking",
});

const topics = [
  { title: "Compounding Growth Systems", detail: "Why systems beat campaigns, and how to build one that runs without you." },
  { title: "AI Workflows That Actually Ship", detail: "Wiring AI into real work without lowering the quality bar." },
  { title: "Founder-Led Distribution", detail: "Treating distribution as a product feature from day one." },
  { title: "SEO in the Age of LLMs", detail: "What ranking means when Claude and ChatGPT are the new search box." },
];

const formats = [
  { name: "Keynote", detail: "30–45 min, built around your audience and outcome." },
  { name: "Workshop", detail: "Half or full day, hands-on, with takeaway templates." },
  { name: "Podcast / Panel", detail: "Candid, receipts-first conversation." },
];

export default function SpeakingPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Speaking", path: "/speaking" }])} />
      <PageHero
        eyebrow="Speaking"
        title="Talks with receipts"
        description="I speak about the systems behind real outcomes — SEO, AI workflows, and founder-led growth. Rooms leave with things they can use on Monday."
        crumbs={[{ label: "Home", href: "/" }, { label: "Speaking" }]}
        actions={
          <>
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
              <Mic />
              Book me to speak
            </a>
            <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Send details
              <ArrowRight />
            </Link>
          </>
        }
      />

      <Section>
        <Container>
          <SectionHeading eyebrow="Talk topics" title="What I speak about" />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
            {topics.map((t) => (
              <StaggerItem key={t.title}>
                <Card className="h-full p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.detail}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading eyebrow="Formats" title="Built to fit your event" />
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
            {formats.map((f) => (
              <StaggerItem key={f.name}>
                <Card className="h-full p-6">
                  <h3 className="text-base font-semibold">{f.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.detail}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="Recent" title="Talks, podcasts & features" />
          <div className="mt-10 divide-y divide-border rounded-card border border-border">
            {press.map((p) => (
              <div key={p.title} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.outlet}</span>
                    <Badge variant="muted">{p.kind}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.title}</p>
                </div>
                <time className="text-sm text-muted-foreground" dateTime={p.date}>
                  {formatDate(p.date)}
                </time>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
