import Link from "next/link";
import { AdminButton, PageHeader } from "@/components/admin";
import { getAllCollectionsAdmin } from "@/lib/movies/queries";
import { CollectionsTable } from "./collections-table";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const collections = await getAllCollectionsAdmin();
  return (
    <div>
      <PageHeader
        title="Collections"
        description="Editorial groupings like “Best Thrillers” or “Movies for a Lazy Sunday”."
        actions={
          <AdminButton asChild size="sm">
            <Link href="/admin/collections/new">New collection</Link>
          </AdminButton>
        }
      />
      <CollectionsTable
        rows={collections.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          count: c.movieCount ?? 0,
          published: c.isPublished,
          updatedAt: c.updatedAt,
        }))}
      />
    </div>
  );
}
