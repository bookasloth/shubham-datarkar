import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/sections/newsletter-form";

export const metadata = buildMetadata({
  title: "What I'm Focused On Now",
  description: "A living snapshot of what Shubham Datarkar is building, writing, reading, and thinking about right now. Updated roughly monthly.",
  ogTitle: "What I'm focused on right now",
  ogDescription: "Building, writing, reading, thinking — a living snapshot of where my attention goes, updated monthly.",
  path: "/now",
});

const now = [
  {
    heading: "Building",
    items: [
      "Scaling Book A Sloth — India's calmest booking platform — toward public launch.",
      "Growing the Timewheel product family: Ticket Dino, WhatsLoom, and SERP Sutra.",
      "Leading marketing at Grey Hawks Media.",
    ],
  },
  {
    heading: "Writing",
    items: [
      "Two articles a week, one deep SEO/AI piece and one short founder essay.",
      "A pillar on programmatic SEO for B2B that won't read like spam.",
      "The Tuesday newsletter — one signal, no noise.",
    ],
  },
  {
    heading: "Reading",
    items: ["Working in Public — Nadia Eghbal", "The Cold Start Problem — Andrew Chen", "Re-reading Obviously Awesome — April Dunford"],
  },
  {
    heading: "Thinking about",
    items: [
      "How LLM search reshapes what 'ranking' even means in 2026.",
      "Distribution as a product feature, not a marketing afterthought.",
      "The smallest possible team to run three compounding businesses.",
    ],
  },
];

export default function NowPage() {
  return (
    <>
      <PageHero
        eyebrow="Now"
        title="What I'm focused on right now"
        description="A living snapshot of where my attention goes. Updated roughly monthly — last updated June 2026."
        crumbs={[{ label: "Home", href: "/" }, { label: "Now" }]}
      />
      <Section>
        <Container size="narrow">
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {now.map((block) => (
              <StaggerItem key={block.heading}>
                <Card className="h-full p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {block.heading}
                  </h2>
                  <ul className="mt-4 flex flex-col gap-3">
                    {block.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-10">
            <div className="rounded-card border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Want to follow along? The newsletter is the best way.</p>
              <NewsletterForm variant="inline" className="mx-auto mt-4 max-w-md" />
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container size="narrow">
          <div className="rounded-card border border-dashed border-border p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">Live badges</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Self-updating status badges. Embed one on any site — it stays current.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/badge/latest-post" alt="Latest post" height={56} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/badge/posts" alt="Published post count" height={56} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/badge/members" alt="Community member count" height={56} />
            </div>
            <pre className="mt-5 overflow-x-auto rounded-input border border-border bg-muted/40 p-3 text-xs">
              <code>{`<img src="https://shubhamdatarkar.com/api/badge/latest-post" alt="Latest post">`}</code>
            </pre>
          </div>
        </Container>
      </Section>
    </>
  );
}
