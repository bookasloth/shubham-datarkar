import { notFound } from "next/navigation";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { getTool } from "@/lib/data/tools";
import { ToolRunner } from "@/components/tools/tool-runner";

// Only these client-only tools embed cleanly (no server calls, no user data).
const EMBEDDABLE = new Set(["utm-builder", "roas-calculator", "schema-generator"]);

export function generateStaticParams() {
  return [...EMBEDDABLE].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  return buildMetadata({ title: tool ? `${tool.name} — embed` : "Embed", path: `/tools/${slug}/embed`, noIndex: true });
}

export default async function ToolEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool || !EMBEDDABLE.has(slug)) notFound();

  return (
    <div className="min-h-dvh bg-background p-5 text-foreground">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-lg font-semibold tracking-tight">{tool.name}</h1>
        <div className="mt-4">
          <ToolRunner slug={tool.slug} status={tool.status} />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Free tool by{" "}
          <Link href="/tools" target="_blank" className="font-medium underline-offset-4 hover:underline">
            shubhamdatarkar.com
          </Link>
        </p>
      </div>
    </div>
  );
}
