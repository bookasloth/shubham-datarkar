import { ArrowUpRight } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { portfolio, portfolioCounts } from "@/lib/data/portfolio";
import type { WorkItem } from "@/lib/data/portfolio";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Work",
  description: "20+ websites, 8+ SaaS products, 200+ content pieces, 30+ marketing campaigns, and a lab of personal projects.",
  path: "/work",
});

function WorkCard({ item }: { item: WorkItem }) {
  const inner = (
    <Card interactive={!!item.url} className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="muted">{item.tag}</Badge>
        {item.url && <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{item.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
    </Card>
  );
  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block focus-visible:outline-none">
        {inner}
      </a>
    );
  }
  return inner;
}

export default function WorkPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Work", path: "/work" }])} />
      <PageHero
        eyebrow="Work"
        title="Everything I've shipped"
        description="Websites, software, words, and campaigns — built across a decade of agency work, independent projects, and ventures of my own."
        crumbs={[{ label: "Home", href: "/" }, { label: "Work" }]}
      />

      {/* Counts */}
      <Section bleed className="border-b border-border bg-card py-12">
        <Container>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-5">
            {portfolioCounts.map((c) => (
              <div key={c.label} className="bg-card p-5 text-center">
                <div className="font-display text-3xl font-extrabold tracking-tight">{c.count}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </div>
          <nav aria-label="Work categories" className="mt-8 flex flex-wrap justify-center gap-2">
            {portfolio.map((g) => (
              <a key={g.key} href={`#${g.key}`} className="rounded-btn border border-border px-3 py-1.5 text-sm font-medium transition-ui hover:bg-accent">
                {g.label}
              </a>
            ))}
          </nav>
        </Container>
      </Section>

      {portfolio.map((group, i) => (
        <Section key={group.key} id={group.key} className={i % 2 === 1 ? "scroll-mt-24 border-b border-border bg-card" : "scroll-mt-24"}>
          <Container>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{group.label}</h2>
              <span className="font-display text-sm font-bold text-muted-foreground">{group.count}</span>
            </div>
            <p className="mt-1 text-muted-foreground">{group.blurb}</p>
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <StaggerItem key={item.name}>
                  <WorkCard item={item} />
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      ))}

      <CtaBand title="Have something to build?" />
    </>
  );
}
