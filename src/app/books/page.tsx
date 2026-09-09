import { BookOpen } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { getHomepageSections, getPublishedBooks, getPublishedCollections } from "@/lib/books/queries";
import { BookHero } from "@/components/books/book-hero";
import { BookRail } from "@/components/books/book-rail";
import { BookShelfCard } from "@/components/books/book-collection-card";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Books I'm Reading & Recommend",
  description: "The books I'm reading, what I think, and what I've learned.",
  path: "/books",
});

export default async function BooksHomePage() {
  const [sections, collections] = await Promise.all([getHomepageSections(), getPublishedCollections()]);

  const hasSectionContent = sections.some((s) => s.hero || s.books.length > 0);

  // Fallback when the homepage builder hasn't been seeded yet.
  const fallback = hasSectionContent ? null : await buildFallback();
  const hero = sections.find((s) => s.kind === "hero" && s.hero)?.hero ?? fallback?.hero ?? null;

  const nonEmpty = hasSectionContent ? sections.filter((s) => s.kind !== "hero" && s.books.length > 0) : [];

  const nothing = !hero && nonEmpty.length === 0 && !fallback?.recent?.length;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Handpicked by Shubham
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Books I&apos;m reading and recommend
        </h1>
      </header>

      {nothing ? (
        <EmptyShelf />
      ) : (
        <>
          {hero && <BookHero book={hero} />}

          {nonEmpty.map((s) => (
            <BookRail
              key={s.id}
              title={s.title}
              books={s.books}
              href={s.collectionSlug ? `/books/shelf/${s.collectionSlug}` : undefined}
            />
          ))}

          {fallback?.recent && fallback.recent.length > 0 && (
            <BookRail title="Recently Added" books={fallback.recent} />
          )}

          {collections.length > 0 && (
            <section id="shelves">
              <h2 className="mb-3 px-1 font-display text-lg font-bold tracking-tight sm:text-xl">
                Browse shelves
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((c) => (
                  <BookShelfCard key={c.id} shelf={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

async function buildFallback() {
  const recent = await getPublishedBooks(20);
  return { recent, hero: recent[0] ?? null };
}

function EmptyShelf() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-20 text-center">
      <BookOpen className="mb-3 size-8 text-muted-foreground" aria-hidden />
      <p className="font-display text-lg font-semibold">Your book shelf is still empty.</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Recommendations are on the way — check back soon for the first picks.
      </p>
    </div>
  );
}
