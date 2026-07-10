import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";

export const metadata = buildMetadata({
  title: "KalamAI Analysis",
  path: "/tools/kalamai",
  noIndex: true,
});

export default async function KalamaiAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireMember(`/tools/kalamai/a/${id}`);

  // Ownership-scoped read. Unknown or someone else's id → 404. The report body
  // and live polling land here with the research engine (Phase 2).
  const { data: analysis } = await supabaseAdmin()
    .from("kalamai_analyses")
    .select("id, keyword, status, progress")
    .eq("id", id)
    .eq("user_id", ctx.user!.id)
    .maybeSingle();
  if (!analysis) notFound();

  return (
    <>
      <PageHero
        eyebrow="KalamAI analysis"
        title={analysis.keyword}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "KalamAI", href: "/tools/kalamai" },
          { label: "Analysis" },
        ]}
      />
      <Section>
        <Container size="narrow">
          <div className="rounded-card border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{analysis.status}</span>
            </p>
          </div>
          <Link href="/tools/kalamai/history" className="mt-4 inline-block text-sm font-medium hover:underline">
            Back to history
          </Link>
        </Container>
      </Section>
    </>
  );
}
