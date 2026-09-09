import Link from "next/link";
import { AdminButton, PageHeader } from "@/components/admin";
import { getAllCollectionsAdmin } from "@/lib/books/queries";
import { ShelvesTable } from "./shelves-table";

export const dynamic = "force-dynamic";

export default async function AdminShelvesPage() {
  const shelves = await getAllCollectionsAdmin();
  return (
    <div>
      <PageHeader
        title="Shelves"
        description="Editorial groupings like “Best Thrillers” or “Books for a Lazy Sunday”."
        actions={
          <>
            <AdminButton asChild variant="ghost" size="sm">
              <Link href="/admin/books">Back to books</Link>
            </AdminButton>
            <AdminButton asChild size="sm">
              <Link href="/admin/books/shelves/new">New shelf</Link>
            </AdminButton>
          </>
        }
      />
      <ShelvesTable
        rows={shelves.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          // ponytail: BookCollection has no bookCount field yet — render — rather than block on a new query.
          count: null as number | null,
          published: s.isPublished,
          updatedAt: s.updatedAt,
        }))}
      />
    </div>
  );
}
