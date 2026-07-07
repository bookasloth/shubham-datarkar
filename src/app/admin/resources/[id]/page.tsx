import { notFound } from "next/navigation";
import {
  getResourceByIdAdmin,
  getTagNamesForResourceAdmin,
  getTaxonomyAdmin,
} from "@/lib/resources/admin-queries";
import { deleteResource, updateResource } from "@/lib/resources/actions";
import { ResourceEditor } from "@/components/admin/resource-editor";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [resource, tagNames, { types, categories }] = await Promise.all([
    getResourceByIdAdmin(id),
    getTagNamesForResourceAdmin(id),
    getTaxonomyAdmin(),
  ]);
  if (!resource) notFound();

  const update = updateResource.bind(null, id);
  const remove = deleteResource.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit resource</h1>
        <form action={remove}>
          <Button type="submit" variant="outline" size="sm">
            Delete
          </Button>
        </form>
      </div>
      <ResourceEditor
        action={update}
        resource={resource}
        tagNames={tagNames}
        types={types}
        categories={categories}
      />
    </div>
  );
}
