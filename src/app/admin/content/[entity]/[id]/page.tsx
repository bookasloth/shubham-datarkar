import { notFound } from "next/navigation";
import { getEntity } from "@/lib/content/registry";
import { getEntityByIdAdmin } from "@/lib/content/queries";
import { updateEntity, deleteEntity } from "@/lib/content/actions";
import { EntityEditor } from "@/components/admin/entity-editor";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditEntityPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const row = await getEntityByIdAdmin(def.table, id);
  if (!row) notFound();

  const update = updateEntity.bind(null, def.key, id);
  const remove = deleteEntity.bind(null, def.key, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit {def.label}</h1>
        <form action={remove}>
          <Button type="submit" variant="outline" size="sm">
            Delete
          </Button>
        </form>
      </div>
      <EntityEditor
        action={update}
        hasSlug={def.hasSlug}
        value={{ slug: row.slug, published: row.published, sort: row.sort, data: row.data }}
      />
    </div>
  );
}
