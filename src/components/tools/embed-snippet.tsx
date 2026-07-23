import { site } from "@/lib/site";
import { CopyButton } from "@/components/ui/copy-button";

const EMBEDDABLE = new Set(["utm-builder", "roas-calculator", "schema-generator"]);

/** Shows the iframe snippet to embed a tool on another site (with a backlink). */
export function EmbedSnippet({ slug, name }: { slug: string; name: string }) {
  if (!EMBEDDABLE.has(slug)) return null;
  const code = `<iframe src="${site.url}/tools/${slug}/embed" width="100%" height="560" style="border:1px solid #e5e5e5;border-radius:12px" title="${name} — free tool by ${site.name}" loading="lazy"></iframe>`;
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Embed this tool</h2>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        Free to drop on your own site — copy the snippet, paste it into your page. A small credit link comes with it.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-card border border-border bg-muted/60 p-4 text-xs">
        <code className="font-mono">{code}</code>
      </pre>
      <div className="mt-3">
        <CopyButton value={code} label="Copy embed code" />
      </div>
    </div>
  );
}
