import { Film } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import {
  getHomepageSections,
  getPublishedMovies,
  getPublishedCollections,
  getRecentlyAdded,
} from "@/lib/movies/queries";
import { MovieHero } from "@/components/movies/movie-hero";
import { MovieRail } from "@/components/movies/movie-rail";
import { CollectionCard } from "@/components/movies/collection-card";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Movies I Recommend",
  description:
    "A personally curated, cinematic guide to films worth your time — my ratings, verdicts, and honest reviews across thrillers, dramas, hidden gems, and more.",
  path: "/movies",
});

export default async function MoviesHomePage() {
  const [sections, collections] = await Promise.all([
    getHomepageSections(),
    getPublishedCollections(),
  ]);

  const hasSectionContent = sections.some((s) => s.hero || s.movies.length > 0);

  // Fallback when the homepage builder hasn't been seeded yet.
  const fallback = hasSectionContent ? null : await buildFallback();
  const hero = sections.find((s) => s.section.kind === "hero" && s.hero)?.hero ?? fallback?.hero ?? null;

  const nonEmpty = hasSectionContent
    ? sections.filter((s) => s.section.kind !== "hero" && s.movies.length > 0)
    : [];

  const nothing = !hero && nonEmpty.length === 0 && !fallback?.recent?.length;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Handpicked by Shubham
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Movies I think you should watch
        </h1>
      </header>

      {nothing ? (
        <EmptyShelf />
      ) : (
        <>
          {hero && <MovieHero movie={hero} />}

          {nonEmpty.map((s) => (
            <MovieRail
              key={s.section.id}
              title={s.section.title}
              movies={s.movies}
              href={s.collectionSlug ? `/collections/${s.collectionSlug}` : undefined}
            />
          ))}

          {fallback?.recent && fallback.recent.length > 0 && (
            <MovieRail title="Recently Added" movies={fallback.recent} />
          )}

          {collections.length > 0 && (
            <section>
              <h2 className="mb-3 px-1 font-display text-lg font-bold tracking-tight sm:text-xl">
                Browse Collections
              </h2>
              <div className="flex snap-x gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {collections.map((c) => (
                  <div key={c.id} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
                    <CollectionCard collection={c} />
                  </div>
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
  const [recent, top] = await Promise.all([getRecentlyAdded(20), getPublishedMovies(1)]);
  return { recent, hero: recent[0] ?? top[0] ?? null };
}

function EmptyShelf() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-20 text-center">
      <Film className="mb-3 size-8 text-muted-foreground" aria-hidden />
      <p className="font-display text-lg font-semibold">Your movie shelf is still empty.</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Recommendations are on the way — check back soon for the first picks.
      </p>
    </div>
  );
}
