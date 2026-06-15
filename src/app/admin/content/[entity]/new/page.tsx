import { notFound } from "next/navigation";
import { getEntity } from "@/lib/content/registry";
import { createEntity } from "@/lib/content/actions";
import { EntityEditor } from "@/components/admin/entity-editor";

export default async function NewEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const action = createEntity.bind(null, def.key);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New {def.label}</h1>
      <EntityEditor action={action} hasSlug={def.hasSlug} />
    </div>
  );
}
