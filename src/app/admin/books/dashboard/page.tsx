import Link from "next/link";
import { getAllBooksAdmin } from "@/lib/books/queries";
import { computeReadingStats } from "@/lib/books/reading-stats";
import { PageHeader } from "@/components/admin";
import { ReadingStats } from "@/components/admin/reading-stats";

export const dynamic = "force-dynamic";

export default async function BooksDashboardPage() {
  const books = await getAllBooksAdmin();
  const stats = computeReadingStats(books);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reading"
        description="Reading progress and stats across the shelf."
        actions={
          <Link href="/admin/books" className="text-sm text-admin-text-muted hover:text-admin-accent">
            Back to books
          </Link>
        }
      />
      <ReadingStats stats={stats} />
    </div>
  );
}
