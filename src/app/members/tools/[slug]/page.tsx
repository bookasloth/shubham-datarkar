import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getToolBySlug } from "@/lib/members/queries";
import { ToolRenderer } from "@/components/members/tools/registry";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/members/tools"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-ui hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All tools
      </Link>

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">{tool.name}</h1>
        {tool.description && (
          <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
        )}
      </header>

      <ToolRenderer componentKey={tool.component} />
    </div>
  );
}
