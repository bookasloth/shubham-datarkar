import Link from "next/link";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { formatRuntime, type Movie } from "@/lib/movies/types";
import { Poster } from "./poster";
import { MovieRating } from "./movie-rating";
import { RecommendationBadge } from "./recommendation-badge";
import { TrailerButton } from "./trailer-button";
import { MyListButton } from "./my-list-button";

/**
 * Cinematic hero. Server-rendered for LCP/SEO; only the trailer + list buttons
 * are client islands. A bottom-left gradient keeps the text legible over art.
 */
export function MovieHero({ movie }: { movie: Movie }) {
  const review = movie.review;
  const runtime = formatRuntime(movie.runtime);
  const genres = (movie.genres ?? []).slice(0, 3);
  const blurb = review?.shortReview || review?.verdict || movie.overview;

  return (
    <section className="relative isolate overflow-hidden rounded-card border border-border">
      <div className="relative h-[62vh] min-h-[420px] w-full sm:h-[68vh] sm:max-h-[680px]">
        <Poster
          src={movie.backdropUrl ?? movie.posterUrl}
          alt={movie.title}
          sizes="100vw"
          priority
        />
        {/* Cinematic gradients for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/20 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-10">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {review?.recommendationType && <RecommendationBadge type={review.recommendationType} />}
            {review?.rating != null && <MovieRating rating={review.rating} size="lg" />}
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
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
            {genres.length > 0 && <span>{genres.map((g) => g.name).join(" · ")}</span>}
          </div>

          {blurb && (
            <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-foreground/90 sm:text-base">
              {blurb}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <TrailerButton url={movie.trailerUrl} title={movie.title} size="lg" />
            <Link
              href={`/movies/${movie.slug}`}
              className="inline-flex h-12 items-center gap-1.5 rounded-btn border border-border bg-background/60 px-6 text-base font-medium backdrop-blur transition-ui hover:bg-accent"
            >
              Read Review <ArrowRight className="size-4" />
            </Link>
            <MyListButton movieId={movie.id} size="lg" variant="secondary" />
          </div>
        </div>
      </div>
    </section>
  );
}
