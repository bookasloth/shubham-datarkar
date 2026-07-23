import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buildMetadata, breadcrumbSchema, softwareAppSchema, faqSchema } from "@/lib/seo";
import { tools, getTool } from "@/lib/data/tools";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { ToolRunner } from "@/components/tools/tool-runner";
import { ToolCard } from "@/components/cards/tool-card";
import { JsonLd } from "@/components/seo/json-ld";

export function generateStaticParams() {
  // kalamai has its own static route at /tools/kalamai — exclude it so the two
  // don't both try to resolve the same path at build.
  return tools.filter((t) => t.slug !== "kalamai").map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return buildMetadata({ title: "Tool", path: `/tools/${slug}` });
  return buildMetadata({
    title: tool.seo?.title ?? tool.name,
    description: tool.seo?.description ?? tool.description,
    ogTitle: tool.seo?.ogTitle,
    ogDescription: tool.seo?.ogDescription,
    path: `/tools/${tool.slug}`,
  });
}

export default async function ToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const related = tools.filter((t) => t.slug !== tool.slug && t.category === tool.category).slice(0, 3);
  const fallback = tools.filter((t) => t.slug !== tool.slug).slice(0, 3);
  const more = related.length ? related : fallback;
  const c = tool.content;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: tool.name, path: `/tools/${tool.slug}` },
        ])}
      />
      {c && (
        <JsonLd
          data={softwareAppSchema({
            name: tool.name,
            description: tool.seo?.description ?? tool.description,
            path: `/tools/${tool.slug}`,
            category: c.appCategory,
            features: c.features,
          })}
        />
      )}
      {c?.faq?.length ? <JsonLd data={faqSchema(c.faq)} /> : null}
      <PageHero
        eyebrow={`${tool.category} tool`}
        title={tool.name}
        description={tool.description}
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: tool.name }]}
      />
      <Section>
        <Container>
          <Card className="p-6 md:p-8">
            <ToolRunner slug={tool.slug} status={tool.status} />
          </Card>
        </Container>
      </Section>

      {c && (
        <Section>
          <Container size="narrow">
            {c.overview?.length ? (
              <div className="flex flex-col gap-5">
                {c.overview.map((p) => (
                  <p key={p.slice(0, 24)} className="text-[17px] leading-8 text-foreground/90">
                    {p}
                  </p>
                ))}
              </div>
            ) : null}

            {c.features?.length ? (
              <div className="mt-12 border-t border-border pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">What it does</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {c.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[17px] leading-8 text-foreground/90">
                      <span className="mt-3 size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {c.howTo?.length ? (
              <div className="mt-12 border-t border-border pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">How to use it</h2>
                <ol className="mt-5 flex flex-col gap-3">
                  {c.howTo.map((step, i) => (
                    <li key={step} className="flex gap-4 text-[17px] leading-8 text-foreground/90">
                      <span className="mt-1 font-display text-sm font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {c.faq?.length ? (
              <div className="mt-12 border-t border-border pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">FAQ</h2>
                <dl className="mt-5 flex flex-col">
                  {c.faq.map((f) => (
                    <div key={f.question} className="border-b border-border py-5 first:pt-0 last:border-b-0">
                      <dt className="font-semibold tracking-tight">{f.question}</dt>
                      <dd className="mt-2 text-muted-foreground">{f.answer}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </Container>
        </Section>
      )}

      <Section bleed className="border-t border-border bg-card py-16">
        <Container>
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">More tools</h2>
            <Link href="/tools" className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2">
              All tools <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
