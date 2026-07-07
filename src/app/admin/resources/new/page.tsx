import { createResource } from "@/lib/resources/actions";
import { getTaxonomyAdmin } from "@/lib/resources/admin-queries";
import { ResourceEditor } from "@/components/admin/resource-editor";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  const { types, categories } = await getTaxonomyAdmin();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New resource</h1>
      <ResourceEditor
        action={createResource}
        types={types.filter((t) => t.active)}
        categories={categories.filter((c) => c.active)}
      />
    </div>
  );
}
