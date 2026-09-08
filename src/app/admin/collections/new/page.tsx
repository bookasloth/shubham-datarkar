import { PageHeader } from "@/components/admin";
import { CollectionEditor } from "@/components/admin/collection-editor";

export const dynamic = "force-dynamic";

export default function NewCollectionPage() {
  return (
    <div>
      <PageHeader title="New collection" description="Create the collection, then add movies to it." />
      <CollectionEditor mode="create" />
    </div>
  );
}
