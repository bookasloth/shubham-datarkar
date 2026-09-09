import Link from "next/link";
import { AdminButton, PageHeader } from "@/components/admin";
import { getAllBooksAdmin } from "@/lib/books/queries";
import { RefreshCoversButton } from "@/components/admin/refresh-covers-button";
import { BooksTable } from "./books-table";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage() {
  const books = await getAllBooksAdmin();
  return (
    <div>
      <PageHeader
        title="Books"
        description="Every book in the library — reading status, ratings, and my reviews."
        actions={
          <div className="flex gap-2">
            <RefreshCoversButton />
            <AdminButton asChild size="sm" variant="secondary">
              <Link href="/admin/books/shelves">Shelves</Link>
            </AdminButton>
            <AdminButton asChild size="sm">
              <Link href="/admin/books/new">New book</Link>
            </AdminButton>
          </div>
        }
      />
      <BooksTable
        rows={books.map((b) => ({
          id: b.id,
          slug: b.slug,
          title: b.title,
          author: b.author ?? "",
          status: b.reading?.status ?? "—",
          percentage: b.reading?.percentage ?? null,
          rating: b.review?.rating != null ? b.review.rating.toFixed(1) : "—",
          genres: (b.genres ?? []).map((g) => g.name).join(", "),
          published: b.isPublished,
          reviewPublished: b.review?.published ?? false,
          updatedAt: b.updatedAt,
        }))}
      />
    </div>
  );
}
