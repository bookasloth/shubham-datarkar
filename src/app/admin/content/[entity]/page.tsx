import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntity, rowTitle } from "@/lib/content/registry";
import { getAllEntitiesAdmin } from "@/lib/content/queries";
import { AdminButton, PageHeader } from "@/components/admin";
import { EntityTable } from "./entity-table";

export const dynamic = "force-dynamic";

export default async function EntityListPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const raw = await getAllEntitiesAdmin(def.table);
  const rows = raw.map((r) => ({
    id: r.id,
    title: rowTitle(def, r.data, r.slug ?? r.id),
    slug: r.slug,
    published: r.published,
  }));

  return (
    <div>
      <PageHeader
        title={def.label}
        actions={
          <AdminButton asChild size="sm">
            <Link href={`/admin/content/${def.key}/new`}>New</Link>
          </AdminButton>
        }
      />
      <EntityTable rows={rows} entityKey={def.key} />
    </div>
  );
}
