import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import { resolveKalamaiRole, getQuotaUsage } from "@/lib/kalamai/quota-server";
import { listRecentAnalyses } from "@/lib/kalamai/queries-server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { QuotaBadge } from "@/components/kalamai/quota-badge";
import { KalamaiTeaser } from "@/components/kalamai/teaser";
import { NewAnalysisForm } from "@/components/kalamai/new-analysis-form";

// noindex — gated tool; the public /tools grid card is the discoverable surface.
export const metadata = buildMetadata({
  title: "KalamAI",
  description:
    "Keyword and location in, a data-backed SEO/AEO/GEO content brief and a drafted article out. A KalamAI tool for Kalamwala community members.",
  path: "/tools/kalamai",
  noIndex: true,
});
export const dynamic = "force-dynamic";

export default async function KalamaiHomePage() {
  const ctx = await getMemberContext();
  if (!ctx.user) return <KalamaiTeaser />;

  const role = await resolveKalamaiRole(ctx);
  const [usage, recent] = await Promise.all([getQuotaUsage(ctx.user.id, role), listRecentAnalyses(ctx.user.id, 8)]);

  return (
    <>
      <PageHero
        eyebrow="KalamAI"
        title="Your KalamAI workspace"
        description="Turn a keyword and location into a data-backed brief."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "KalamAI" }]}
        actions={<QuotaBadge usage={usage} />}
      />
      <Section>
        <Container size="narrow">
          <NewAnalysisForm />

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Recent analyses</h2>
              {recent.length > 0 && (
                <Link href="/tools/kalamai/history" className="text-sm font-medium hover:underline">
                  All history
                </Link>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">You haven&rsquo;t run an analysis yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/tools/kalamai/a/${r.id}`} className="flex items-center justify-between gap-3 p-4 transition-ui hover:bg-muted">
                      <span className="truncate text-sm">{r.keyword}</span>
                      <span className="shrink-0 rounded-btn bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                        {r.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
