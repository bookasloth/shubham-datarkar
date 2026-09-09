import Link from "next/link";
import { Search } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { searchPublishedBooks } from "@/lib/books/queries";
import { BookGrid } from "@/components/books/book-grid";

// Results depend on the query string — render per request, and keep it out of
// the index (thin, query-driven pages).
export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Search Books",
  description: "Search my library by title, author, or topic.",
  path: "/books/search",
  noIndex: true,
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const results = q ? await searchPublishedBooks(q) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {q ? <>Results for “{q}”</> : "Search books"}
        </h1>
        {q && (
          <p className="mt-1 text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "book" : "books"} found
          </p>
        )}
      </div>

      {!q ? (
        <EmptyPrompt />
      ) : results.length === 0 ? (
        <NoResults />
      ) : (
        <BookGrid books={results} />
      )}
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
      <Search className="mb-3 size-7 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">Search my library by title, author, or topic.</p>
    </div>
  );
}

function NoResults() {
  return (
    <div className="space-y-6 rounded-card border border-dashed border-border p-8 text-center">
      <div>
        <p className="font-display text-lg font-semibold">No books found.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different title or author — or browse the shelves.
        </p>
      </div>
      <div className="flex justify-center">
        <Link
          href="/books"
          className="rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
        >
          Browse books
        </Link>
      </div>
    </div>
  );
}
