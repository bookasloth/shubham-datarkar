import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/sections/newsletter-form";

export const metadata = buildMetadata({
  title: "Now",
  description: "What Shubham Datarkar is focused on right now — building, reading, and thinking about.",
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
    </>
  );
}
