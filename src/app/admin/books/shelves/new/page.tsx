import { PageHeader } from "@/components/admin";
import { ShelfEditor } from "@/components/admin/shelf-editor";

export const dynamic = "force-dynamic";

export default function NewShelfPage() {
  return (
    <div>
      <PageHeader title="New shelf" description="Create the shelf, then add books to it." />
      <ShelfEditor mode="create" />
    </div>
  );
}
