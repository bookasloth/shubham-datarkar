import Link from "next/link";
import { Search } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { searchPublishedMovies, getPublishedCollections } from "@/lib/movies/queries";
import { MovieGrid } from "@/components/movies/movie-grid";

// Results depend on the query string — render per request, and keep it out of
// the index (thin, query-driven pages).
export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Search Movies",
  description: "Search my movie recommendations by title, director, cast, genre, or mood.",
  path: "/movies/search",
  noIndex: true,
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const results = q ? await searchPublishedMovies(q) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {q ? <>Results for “{q}”</> : "Search movies"}
        </h1>
        {q && (
          <p className="mt-1 text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "movie" : "movies"} found
          </p>
        )}
      </div>

      {!q ? (
        <EmptyPrompt />
      ) : results.length === 0 ? (
        <NoResults />
      ) : (
        <MovieGrid movies={results} />
      )}
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
      <Search className="mb-3 size-7 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Search by title, director, cast, genre, or mood.
      </p>
    </div>
  );
}

async function NoResults() {
  const collections = await getPublishedCollections();
  return (
    <div className="space-y-6 rounded-card border border-dashed border-border p-8 text-center">
      <div>
        <p className="font-display text-lg font-semibold">No movies found.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different title or actor — or start from a collection.
        </p>
      </div>
      {collections.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {collections.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
            >
              {c.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
