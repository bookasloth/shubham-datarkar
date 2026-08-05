import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { resolveKalamaiRole, getQuotaUsage } from "@/lib/kalamai/quota-server";
import { listRecentArticles } from "@/lib/kalamai/queries-server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { QuotaBadge } from "@/components/kalamai/quota-badge";
import { ContentTypeBadge } from "@/components/kalamai/content-type-badge";

export const metadata = buildMetadata({
  title: "KalamAI History",
  path: "/tools/kalamai/history",
  noIndex: true,
});
export const dynamic = "force-dynamic";

export default async function KalamaiHistoryPage() {
  const ctx = await requireMember("/tools/kalamai/history");
  const role = await resolveKalamaiRole(ctx);
  const [usage, analyses] = await Promise.all([
    getQuotaUsage(ctx.user!.id, role),
    listRecentArticles(ctx.user!.id, 50),
  ]);

  return (
    <>
      <PageHero
        eyebrow="KalamAI"
        title="History"
        description="Your content."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "KalamAI", href: "/tools/kalamai" },
          { label: "History" },
        ]}
        actions={<QuotaBadge usage={usage} />}
      />
      <Section>
        <Container size="narrow">
          {analyses.length === 0 ? (
            <div className="rounded-card border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">No content yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-card">
              {analyses.map((r) => (
                <li key={r.articleId}>
                  <Link
                    href={`/tools/kalamai/w/${r.articleId}`}
                    className="flex items-center justify-between gap-3 p-4 transition-ui hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{r.title !== "Untitled article" ? r.title : r.keyword}</span>
                      <span className="text-xs text-muted-foreground">{r.keyword}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <ContentTypeBadge type={r.contentType} />
                      <span className="rounded-btn bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                        {r.overall != null ? `${r.status} · ${r.overall}/100` : r.status}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/tools/kalamai" className="mt-4 inline-block text-sm font-medium hover:underline">
            Back to KalamAI
          </Link>
        </Container>
      </Section>
    </>
  );
}
