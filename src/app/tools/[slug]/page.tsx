import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { tools, getTool } from "@/lib/data/tools";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { ToolRunner } from "@/components/tools/tool-runner";
import { ToolCard } from "@/components/cards/tool-card";
import { JsonLd } from "@/components/seo/json-ld";

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
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

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: tool.name, path: `/tools/${tool.slug}` },
        ])}
      />
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
