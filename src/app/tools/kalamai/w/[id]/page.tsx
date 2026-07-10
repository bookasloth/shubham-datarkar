import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";

export const metadata = buildMetadata({
  title: "KalamAI Article",
  path: "/tools/kalamai",
  noIndex: true,
});

export default async function KalamaiArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireMember(`/tools/kalamai/w/${id}`);

  // Ownership-scoped read. The rendered article, editor, and export land here
  // with the writing engine (Phase 3).
  const { data: article } = await supabaseAdmin()
    .from("kalamai_articles")
    .select("id, status, meta")
    .eq("id", id)
    .eq("user_id", ctx.user!.id)
    .maybeSingle();
  if (!article) notFound();

  const title = (article.meta as { title?: string } | null)?.title ?? "Article";

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
          <div className="rounded-card border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{article.status}</span>
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
