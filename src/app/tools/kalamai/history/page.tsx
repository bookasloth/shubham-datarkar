import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { resolveKalamaiRole, getQuotaUsage } from "@/lib/kalamai/quota-server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { QuotaBadge } from "@/components/kalamai/quota-badge";

export const metadata = buildMetadata({
  title: "KalamAI History",
  path: "/tools/kalamai/history",
  noIndex: true,
});

export default async function KalamaiHistoryPage() {
  const ctx = await requireMember("/tools/kalamai/history");
  const role = await resolveKalamaiRole(ctx);
  const usage = await getQuotaUsage(ctx.user!.id, role);

  return (
    <>
      <PageHero
        eyebrow="KalamAI"
        title="History"
        description="Your past analyses and articles."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "KalamAI", href: "/tools/kalamai" },
          { label: "History" },
        ]}
        actions={<QuotaBadge usage={usage} />}
      />
      <Section>
        <Container size="narrow">
          <div className="rounded-card border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">No analyses or articles yet.</p>
          </div>
          <Link href="/tools/kalamai" className="mt-4 inline-block text-sm font-medium hover:underline">
            Back to KalamAI
          </Link>
        </Container>
      </Section>
    </>
  );
}
