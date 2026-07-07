import Link from "next/link";
import { getAllResourcesAdmin } from "@/lib/resources/admin-queries";
import { AdminButton, PageHeader } from "@/components/admin";
import { ResourcesTable } from "./resources-table";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const resources = await getAllResourcesAdmin();
  return (
    <div>
      <PageHeader
        title="Resources"
        description="Everything in the members library — articles, prompts, templates, workflows, and more."
        actions={
          <div className="flex gap-2">
            <AdminButton asChild size="sm" variant="secondary">
              <Link href="/admin/resources/taxonomy">Taxonomy</Link>
            </AdminButton>
            <AdminButton asChild size="sm">
              <Link href="/admin/resources/new">New resource</Link>
            </AdminButton>
          </div>
        }
      />
      <ResourcesTable
        rows={resources.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          category: r.category?.name ?? "",
          visibility: r.visibility,
          status: r.status,
          featured: r.featured,
          views: r.view_count,
          updatedAt: r.updated_at,
        }))}
      />
    </div>
  );
}
