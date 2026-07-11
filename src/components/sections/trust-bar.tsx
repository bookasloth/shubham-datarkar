import { Container, Section } from "@/components/layout/container";

/**
 * Trust bar. Renders client names as text — no star ratings, no aggregateRating
 * (no real GBP numbers exist). Swap in <img> logos from /public/logos/ once real
 * asset files are added; until then text names ship (never a broken image).
 */
export function TrustBar({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <Section className="py-8">
      <Container>
        <p className="text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">Trusted by</p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {names.map((n) => (
            <li key={n} className="text-sm font-medium text-foreground/70">{n}</li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
