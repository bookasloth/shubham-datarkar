import { buildMetadata } from "@/lib/seo";
import { principles } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

export const metadata = buildMetadata({
  title: "Systems Over Hustle",
  description: "The operating principles behind everything I build — systems over hustle, compounding over campaigns, decades of thinking shipped in weeks.",
  ogTitle: "Systems over hustle",
  ogDescription: "The operating principles behind everything I build. Simple to say, hard to hold when it's inconvenient.",
  path: "/philosophy",
});

export default function PhilosophyPage() {
  return (
    <>
      <PageHero
        eyebrow="Philosophy"
        title="Systems over hustle"
        description="A short set of operating principles. They sound simple. Holding to them when it's inconvenient is the entire discipline."
        crumbs={[{ label: "Home", href: "/" }, { label: "Philosophy" }]}
      />
      <Section>
        <Container size="narrow">
          <Stagger className="flex flex-col">
            {principles.map((p, i) => (
              <StaggerItem key={p.title}>
                <div className="flex gap-6 border-b border-border py-8 last:border-b-0">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-muted-foreground/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{p.title}</h2>
                    <p className="mt-2 text-lg font-medium leading-8 text-foreground">{p.text}</p>
                    <p className="mt-3 text-[17px] leading-8 text-foreground/80">{p.expanded}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-10">
            <blockquote className="border-l-2 border-foreground pl-5">
              <p className="font-display text-xl font-medium leading-snug tracking-tight">
                Think in decades, ship in weeks. The cadence is what compounds — not the heroics.
              </p>
            </blockquote>
          </Reveal>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
