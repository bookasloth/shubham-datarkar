import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, Calendar, Globe, Film } from "lucide-react";
import { buildMetadata, movieSchema, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  getPublishedMovieBySlug,
  getPublishedMovieSlugs,
  getSimilarMovies,
  getCollectionsContainingMovie,
} from "@/lib/movies/queries";
import { formatRuntime, type Movie } from "@/lib/movies/types";
import { Poster } from "@/components/movies/poster";
import { MovieRating } from "@/components/movies/movie-rating";
import { RecommendationBadge } from "@/components/movies/recommendation-badge";
import { TrailerButton } from "@/components/movies/trailer-button";
import { MyListButton } from "@/components/movies/my-list-button";
import { MovieRail } from "@/components/movies/movie-rail";
import { CollectionCard } from "@/components/movies/collection-card";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPublishedMovieSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getPublishedMovieBySlug(slug);
  if (!movie) return buildMetadata({ title: "Movie", path: `/movies/${slug}`, noIndex: true });

  const year = movie.releaseYear ? ` (${movie.releaseYear})` : "";
  const description =
    movie.review?.shortReview ||
    movie.review?.verdict ||
    movie.overview ||
    `My review and recommendation of ${movie.title}${year}.`;

  const base = buildMetadata({
    title: `${movie.title}${year} Review`,
    description,
    path: `/movies/${movie.slug}`,
    type: "article",
    publishedTime: movie.createdAt,
    modifiedTime: movie.updatedAt,
  });
  // Poster/backdrop makes a far better social card than the site default.
  const ogImage = movie.backdropUrl ?? movie.posterUrl;
  return ogImage
    ? { ...base, openGraph: { ...base.openGraph, images: [{ url: ogImage }] } }
    : base;
}

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await getPublishedMovieBySlug(slug);
  if (!movie) notFound();

  const [similar, relatedCollections] = await Promise.all([
    getSimilarMovies(movie, 14),
    getCollectionsContainingMovie(movie.id),
  ]);

  const review = movie.review;
  const runtime = formatRuntime(movie.runtime);
  const genres = movie.genres ?? [];

  return (
    <article className="space-y-10">
      <JsonLd
        data={[
          movieSchema({
            title: movie.title,
            description: movie.overview ?? review?.shortReview ?? movie.title,
            path: `/movies/${movie.slug}`,
            image: movie.backdropUrl ?? movie.posterUrl ?? undefined,
            datePublished: movie.releaseDate,
            director: movie.director,
            actors: movie.cast.map((c) => c.name).slice(0, 8),
            genres: genres.map((g) => g.name),
            contentRating: movie.ageRating,
            review: review ? { rating: review.rating, body: review.shortReview ?? review.verdict } : null,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Movies", path: "/movies" },
            { name: movie.title, path: `/movies/${movie.slug}` },
          ]),
        ]}
      />

      <Breadcrumb
        items={[
          { label: "Movies", href: "/movies" },
          { label: movie.title },
        ]}
      />

      {/* Hero */}
      <header className="relative overflow-hidden rounded-card border border-border">
        <div className="relative h-[42vh] min-h-[260px] w-full sm:h-[46vh] sm:max-h-[460px]">
          <Poster src={movie.backdropUrl ?? movie.posterUrl} alt={movie.title} sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="relative -mt-24 flex flex-col gap-4 p-5 sm:-mt-28 sm:flex-row sm:items-end sm:p-8">
          <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-img border border-border bg-muted shadow-lg sm:w-40">
            <Poster src={movie.posterUrl} alt={movie.title} sizes="160px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {review?.recommendationType && <RecommendationBadge type={review.recommendationType} />}
              {review?.rating != null && <MovieRating rating={review.rating} size="lg" />}
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
              {movie.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {movie.releaseYear && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" /> {movie.releaseYear}
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {runtime}
                </span>
              )}
              {movie.ageRating && <span className="rounded border border-border px-1.5">{movie.ageRating}</span>}
            </div>
            {genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/movies/genre/${g.slug}`}
                    className="rounded-btn border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TrailerButton url={movie.trailerUrl} title={movie.title} />
              <MyListButton movieId={movie.id} variant="secondary" />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Main editorial column */}
        <div className="space-y-8">
          {review && (review.rating != null || review.verdict || review.recommendationType) && (
            <section className="rounded-card border border-border bg-card p-5 sm:p-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                My Verdict
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {review.rating != null && (
                  <span className="font-display text-4xl font-bold">
                    {review.rating.toFixed(1)}
                    <span className="text-xl font-normal text-muted-foreground"> / 10</span>
                  </span>
                )}
                <RecommendationBadge type={review.recommendationType} />
              </div>
              {review.verdict && <p className="mt-3 text-lg text-foreground">{review.verdict}</p>}
            </section>
          )}

          {(review?.shortReview || review?.fullReview) && (
            <Prose title="My Review">
              {review.shortReview && (
                <p className="text-base leading-relaxed text-foreground">{review.shortReview}</p>
              )}
              {review.fullReview && (
                <p className="whitespace-pre-line leading-relaxed text-foreground">{review.fullReview}</p>
              )}
              {review.spoilerFree && (
                <p className="text-xs text-muted-foreground">This review is spoiler-free.</p>
              )}
            </Prose>
          )}

          {review?.whyRecommend && (
            <Prose title="Why I Recommend This Movie">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.whyRecommend}</p>
            </Prose>
          )}

          {review?.bestFor && (
            <Prose title="Who Should Watch It?">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.bestFor}</p>
            </Prose>
          )}

          {review?.watchIf && (
            <Prose title="Watch If…">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.watchIf}</p>
            </Prose>
          )}

          {review?.notFor && (
            <Prose title="Who Might Not Like It?">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.notFor}</p>
            </Prose>
          )}

          {!review?.shortReview && !review?.fullReview && movie.overview && (
            <Prose title="Overview">
              <p className="leading-relaxed text-muted-foreground">{movie.overview}</p>
            </Prose>
          )}

          {movie.trailerUrl && (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Trailer</h2>
              <TrailerButton url={movie.trailerUrl} title={movie.title} size="lg" />
            </section>
          )}
        </div>

        {/* Info sidebar */}
        <aside className="space-y-6">
          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Movie Information
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Info label="Director" value={movie.director} />
              <Info label="Release" value={movie.releaseDate ?? (movie.releaseYear ? String(movie.releaseYear) : null)} />
              <Info label="Runtime" value={runtime || null} />
              <Info
                label="Language"
                value={movie.originalLanguage ? movie.originalLanguage.toUpperCase() : null}
              />
              <Info label="Country" value={movie.country} />
              <Info label="Rated" value={movie.ageRating} />
              {genres.length > 0 && <Info label="Genres" value={genres.map((g) => g.name).join(", ")} />}
              {movie.moods.length > 0 && <Info label="Mood" value={movie.moods.join(", ")} />}
            </dl>
          </section>

          {movie.cast.length > 0 && <CastList movie={movie} />}
        </aside>
      </div>

      {similar.length > 0 && (
        <MovieRail title="Similar Movies" movies={similar} />
      )}

      {relatedCollections.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 font-display text-lg font-bold tracking-tight sm:text-xl">
            Related Collections
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCollections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{value}</dd>
    </div>
  );
}

function CastList({ movie }: { movie: Movie }) {
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cast</h2>
      <ul className="mt-3 space-y-3">
        {movie.cast.slice(0, 8).map((c, i) => (
          <li key={`${c.name}-${i}`} className="flex items-center gap-3">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {c.profilePath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${c.profilePath}`}
                  alt={c.name}
                  width={40}
                  height={40}
                  className="size-10 object-cover"
                />
              ) : (
                <span className="flex size-10 items-center justify-center text-xs text-muted-foreground">
                  <Film className="size-4" aria-hidden />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
              {c.character && (
                <span className="block truncate text-xs text-muted-foreground">{c.character}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
