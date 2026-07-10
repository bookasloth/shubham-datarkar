import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import { resolveKalamaiRole, getQuotaUsage } from "@/lib/kalamai/quota-server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { QuotaBadge } from "@/components/kalamai/quota-badge";
import { KalamaiTeaser } from "@/components/kalamai/teaser";

// noindex — gated tool; the public /tools grid card is the discoverable surface.
export const metadata = buildMetadata({
  title: "KalamAI",
  description:
    "Keyword and location in, a data-backed SEO/AEO/GEO content brief and a drafted article out. A KalamAI tool for Kalamwala community members.",
  path: "/tools/kalamai",
  noIndex: true,
});

export default async function KalamaiHomePage() {
  const ctx = await getMemberContext();
  if (!ctx.user) return <KalamaiTeaser />;

  const role = await resolveKalamaiRole(ctx);
  const usage = await getQuotaUsage(ctx.user.id, role);

  return (
    <>
      <PageHero
        eyebrow="KalamAI"
        title="Your KalamAI workspace"
        description="Turn a keyword and location into a data-backed brief, then a drafted article."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "KalamAI" }]}
        actions={<QuotaBadge usage={usage} />}
      />
      <Section>
        <Container size="narrow">
          <div className="rounded-card border border-border bg-card p-6">
            <h2 className="text-base font-semibold tracking-tight">Recent analyses</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven&rsquo;t run an analysis yet. Starting a new analysis arrives with the research engine.
            </p>
            <Link
              href="/tools/kalamai/history"
              className="mt-4 inline-block rounded-btn border border-border px-4 py-2 text-sm font-medium transition-ui hover:bg-muted"
            >
              View history
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
