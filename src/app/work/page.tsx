import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { portfolio, portfolioCounts } from "@/lib/data/portfolio";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { WorkCard } from "@/components/cards/work-card";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Everything I've Shipped",
  description: "20+ websites, 8+ SaaS products, 200+ content pieces, and 30+ campaigns — a decade of agency work, independent projects, and ventures of my own.",
  ogTitle: "Everything I've shipped",
  ogDescription: "20+ websites, 8+ SaaS products, 200+ content pieces, 30+ campaigns. A decade of work in one place.",
  path: "/work",
});

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
