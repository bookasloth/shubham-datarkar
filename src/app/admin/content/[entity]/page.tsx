import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntity, rowTitle } from "@/lib/content/registry";
import { getAllEntitiesAdmin } from "@/lib/content/queries";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EntityListPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const rows = await getAllEntitiesAdmin(def.table);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{def.label}</h1>
        <Button asChild size="sm">
          <Link href={`/admin/content/${def.key}/new`}>New</Link>
        </Button>
      </div>
      <div className="grid gap-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/admin/content/${def.key}/${r.id}`}
            className="flex items-center justify-between rounded-card border border-border p-3 hover:bg-accent"
          >
            <span className="font-medium">{rowTitle(def, r.data, r.slug ?? r.id)}</span>
            <span className="text-xs text-muted-foreground">
              {r.published ? "published" : "draft"}
              {r.slug ? ` · ${r.slug}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
