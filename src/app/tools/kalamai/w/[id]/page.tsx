import Link from "next/link";
import { notFound } from "next/navigation";
import type { ContentBlock } from "@/lib/data/types";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ArticleBody } from "@/components/content/article-body";
import { ArticlePoller } from "@/components/kalamai/article-poller";
import { ExportButtons } from "@/components/kalamai/export-buttons";
import { blocksToMarkdown, blocksToHtml } from "@/lib/kalamai/serialize";

export const metadata = buildMetadata({ title: "KalamAI Article", path: "/tools/kalamai", noIndex: true });
export const dynamic = "force-dynamic";

type ArticleMeta = { title?: string; description?: string; ogTitle?: string; ogDescription?: string; jsonld?: string };
type ArticleScore = {
  overall: number;
  passed: string[];
  failed: string[];
  details: { termCoverage: number; outlineCoverage: number; wordCount: number };
};

export default async function KalamaiArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireMember(`/tools/kalamai/w/${id}`);

  let q = supabaseAdmin()
    .from("kalamai_articles")
    .select("id, status, progress, blocks, meta, score")
    .eq("id", id);
  if (ctx.role !== "admin") q = q.eq("user_id", ctx.user!.id); // admin can view any user's article
  const { data: article } = await q.maybeSingle();
  if (!article) notFound();

  const meta = (article.meta ?? {}) as ArticleMeta;
  const blocks = (article.blocks ?? []) as ContentBlock[];
  const score = article.score as ArticleScore | null;
  const title = meta.title || "Article";

  return (
    <>
      <PageHero
        eyebrow="KalamAI article"
        title={title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "KalamAI", href: "/tools/kalamai" },
          { label: "Article" },
        ]}
      />
      <Section>
        <Container size="narrow">
          {article.status === "complete" ? (
            <div className="space-y-8">
              {score && (
                <div className="rounded-card border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Content score</p>
                    <span className="text-2xl font-semibold tabular-nums">{score.overall}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {score.details.wordCount} words · terms {Math.round(score.details.termCoverage * 100)}% · outline{" "}
                    {Math.round(score.details.outlineCoverage * 100)}%
                  </p>
                  {score.failed.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">To improve: {score.failed.join(", ")}.</p>
                  )}
                </div>
              )}

              <ExportButtons slug={slugify(title)} markdown={blocksToMarkdown(blocks)} html={blocksToHtml(blocks)} />

              <article className="rounded-card border border-border bg-card p-6 sm:p-8">
                <ArticleBody blocks={blocks} />
              </article>

              {(meta.title || meta.ogTitle) && (
                <div className="mt-8 rounded-card border border-border bg-card p-6">
                  <p className="text-sm font-medium text-foreground">Search &amp; social</p>
                  <dl className="mt-4 space-y-3 text-sm">
                    {meta.title && (<div><dt className="text-xs font-medium text-muted-foreground">Meta title</dt><dd className="text-foreground">{meta.title}</dd></div>)}
                    {meta.description && (<div><dt className="text-xs font-medium text-muted-foreground">Meta description</dt><dd className="text-foreground">{meta.description}</dd></div>)}
                    {meta.ogTitle && (<div><dt className="text-xs font-medium text-muted-foreground">OG title</dt><dd className="text-foreground">{meta.ogTitle}</dd></div>)}
                    {meta.ogDescription && (<div><dt className="text-xs font-medium text-muted-foreground">OG description</dt><dd className="text-foreground">{meta.ogDescription}</dd></div>)}
                  </dl>
                </div>
              )}
            </div>
          ) : article.status === "failed" ? (
            <div className="rounded-card border border-border bg-card p-6">
              <p className="text-sm font-medium text-danger">Writing this article failed.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your quota was not charged.{" "}
                <Link href="/tools/kalamai/history" className="font-medium text-foreground hover:underline">
                  Back to history
                </Link>
                .
              </p>
            </div>
          ) : (
            <ArticlePoller id={article.id} initialStatus={article.status} initialProgress={article.progress ?? 0} />
          )}

          <Link href="/tools/kalamai/history" className="mt-6 inline-block text-sm font-medium hover:underline">
            Back to history
          </Link>
        </Container>
      </Section>
    </>
  );
}
