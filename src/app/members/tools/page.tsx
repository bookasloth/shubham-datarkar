import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { listLiveTools } from "@/lib/members/queries";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = buildMetadata({ title: "Tools", path: "/members/tools", noIndex: true });

export default async function ToolsPage() {
  const tools = await listLiveTools();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive utilities. No installs, no exports to spreadsheets.
        </p>
      </header>

      {tools.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.id}
              href={`/members/tools/${t.slug}`}
              className="group rounded-card border border-border bg-card p-5 shadow-xs transition-ui hover:border-foreground/30"
            >
              <Wrench className="size-5 text-muted-foreground transition-ui group-hover:text-foreground" />
              <div className="mt-3 text-sm font-semibold group-hover:underline group-hover:underline-offset-4">
                {t.name}
              </div>
              {t.description && (
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Wrench />}
          title="No tools live yet"
          description="Interactive tools are on the way."
        />
      )}
    </div>
  );
}
