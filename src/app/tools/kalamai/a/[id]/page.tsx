import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { AnalysisPoller } from "@/components/kalamai/analysis-poller";
import { KalamaiReport, type AnalysisReport } from "@/components/kalamai/report";

export const metadata = buildMetadata({ title: "KalamAI Analysis", path: "/tools/kalamai", noIndex: true });
export const dynamic = "force-dynamic";

export default async function KalamaiAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireMember(`/tools/kalamai/a/${id}`);

  const { data: a } = await supabaseAdmin()
    .from("kalamai_analyses")
    .select("id, keyword, status, progress, report, low_confidence")
    .eq("id", id)
    .eq("user_id", ctx.user!.id)
    .maybeSingle();
  if (!a) notFound();

  const terminal = a.status === "complete" || a.status === "failed";

  return (
    <>
      <PageHero
        eyebrow="KalamAI analysis"
        title={a.keyword}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "KalamAI", href: "/tools/kalamai" },
          { label: "Analysis" },
        ]}
      />
      <Section>
        <Container size="narrow">
          {a.status === "complete" && a.report ? (
            <KalamaiReport report={a.report as AnalysisReport} lowConfidence={!!a.low_confidence} />
          ) : a.status === "failed" ? (
            <div className="rounded-card border border-border bg-card p-6">
              <p className="text-sm font-medium text-danger">This analysis failed.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your quota was not charged.{" "}
                <Link href="/tools/kalamai" className="font-medium text-foreground hover:underline">
                  Start a new analysis
                </Link>
                .
              </p>
            </div>
          ) : (
            <AnalysisPoller id={a.id} initialStatus={a.status} initialProgress={a.progress ?? 0} />
          )}

          {terminal && (
            <Link href="/tools/kalamai/history" className="mt-6 inline-block text-sm font-medium hover:underline">
              Back to history
            </Link>
          )}
        </Container>
      </Section>
    </>
  );
}
