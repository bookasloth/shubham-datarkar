import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { RunOrchestrator } from "@/components/kalamai/run-orchestrator";
import { KalamaiReport, type AnalysisReport } from "@/components/kalamai/report";
import { NewArticleForm } from "@/components/kalamai/new-article-form";
import { listArticlesForAnalysis } from "@/lib/kalamai/queries-server";

export const metadata = buildMetadata({ title: "KalamAI Analysis", path: "/tools/kalamai", noIndex: true });
export const dynamic = "force-dynamic";

export default async function KalamaiAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const ctx = await requireMember(`/tools/kalamai/a/${id}`);
  const isAdmin = ctx.role === "admin";

  let q = supabaseAdmin()
    .from("kalamai_analyses")
    .select("id, keyword, status, progress, report, low_confidence")
    .eq("id", id);
  if (!isAdmin) q = q.eq("user_id", ctx.user!.id); // admin can view any user's analysis
  const { data: a } = await q.maybeSingle();
  if (!a) notFound();

  const terminal = a.status === "complete" || a.status === "failed";
  const articles = a.status === "complete" ? await listArticlesForAnalysis(a.id) : [];

  const done = articles.find((art) => art.status === "complete");
  if (done && view !== "brief") redirect(`/tools/kalamai/w/${done.id}`);

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
            <div className="space-y-6">
              <KalamaiReport report={a.report as AnalysisReport} lowConfidence={!!a.low_confidence} />
              {articles.length > 0 && (
                <div className="rounded-card border border-border bg-card p-6">
                  <p className="text-sm font-medium text-foreground">Articles written from this brief</p>
                  <ul className="mt-3 divide-y divide-border rounded-card border border-border">
                    {articles.map((art) => (
                      <li key={art.id}>
                        <Link href={`/tools/kalamai/w/${art.id}`} className="flex items-center justify-between gap-3 p-3 transition-ui hover:bg-muted">
                          <span className="min-w-0">
                            <span className="block truncate text-sm">{art.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(art.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-btn bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                            {art.overall != null ? `${art.status} · ${art.overall}/100` : art.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <NewArticleForm analysisId={a.id} />
            </div>
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
            <RunOrchestrator analysisId={a.id} initialStatus={a.status} />
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
