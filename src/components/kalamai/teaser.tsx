import Link from "next/link";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";

const STEPS = [
  {
    title: "Analyze the SERP",
    body: "Enter a keyword and location. KalamAI reads the top 30 results, the questions people ask, and what AI engines cite.",
  },
  {
    title: "Get a data-backed brief",
    body: "Recommended terms by placement, a heading outline, questions to answer, competitor structure, and the schema to ship.",
  },
  {
    title: "Draft the article",
    body: "Turn the brief into a full SEO/AEO/GEO-optimised draft, scored against its own recommendations before you publish.",
  },
];

/** Public teaser shown to signed-out visitors. Doubles as the community funnel. */
export function KalamaiTeaser() {
  return (
    <>
      <PageHero
        eyebrow="KalamAI"
        title="Research and write, backed by the SERP"
        description="Keyword and location in. A data-backed content brief and a drafted article out. Built for the Kalamwala community."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "KalamAI" }]}
      />

      <Section>
        <Container>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-card border border-border bg-card p-6">
                <div className="flex size-9 items-center justify-center rounded-btn bg-muted text-sm font-semibold tabular-nums">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-card border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Members only</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                KalamAI is a gated tool for Kalamwala community members. Sign in to use it, or join the community to get access.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link
                href="/members/login?next=/tools/kalamai"
                className="rounded-btn border border-border px-4 py-2 text-sm font-medium transition-ui hover:bg-muted"
              >
                Sign in
              </Link>
              <Link
                href="/members"
                className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
              >
                Join the community
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
