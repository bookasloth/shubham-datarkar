import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { changelog } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "What's Shipped, in the Open",
  description:
    "Every feature, improvement, and fix shipped on this site — version by version, in the open. Consistency compounds; here's the proof.",
  ogTitle: "Built in the open",
  ogDescription:
    "Consistency compounds. Everything shipped on this site, version by version — the receipts for building in public.",
  path: "/changelog",
});

const typeVariant = {
  Shipped: "default",
  Added: "success",
  Improved: "muted",
  Fixed: "warning",
} as const;

export default function ChangelogPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Changelog", path: "/changelog" }])} />
      <PageHero
        eyebrow="Changelog"
        title="Built in the open"
        description="Consistency compounds. Here's what's shipped on this site, version by version."
        crumbs={[{ label: "Home", href: "/" }, { label: "Changelog" }]}
      />
      <Section>
        <Container size="narrow">
          <Stagger className="flex flex-col gap-10">
            {changelog.map((entry) => (
              <StaggerItem key={entry.version}>
                <article className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-start">
                    <time className="text-sm font-medium text-muted-foreground" dateTime={entry.date}>
                      {formatDate(entry.date)}
                    </time>
                    <span className="font-display text-xs font-bold text-muted-foreground/70">{entry.version}</span>
                  </div>
                  <div className="rounded-card border border-border bg-card p-6">
                    <div className="flex items-center gap-3">
                      <Badge variant={typeVariant[entry.type]}>{entry.type}</Badge>
                      <h2 className="text-base font-semibold">{entry.title}</h2>
                    </div>
                    <ul className="mt-4 flex flex-col gap-2">
                      {entry.notes.map((n) => (
                        <li key={n} className="flex gap-3 text-sm text-muted-foreground">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
    </>
  );
}
