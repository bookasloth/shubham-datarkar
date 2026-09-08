"use client";

import Link from "next/link";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatRuntime, type Movie } from "@/lib/movies/types";
import { Poster } from "./poster";
import { MovieRating } from "./movie-rating";
import { RecommendationBadge } from "./recommendation-badge";
import { TrailerButton } from "./trailer-button";
import { MyListButton } from "./my-list-button";

/** Large cinematic detail modal shown before navigating to the full page. */
export function MovieModal({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  return (
    <Dialog open={!!movie} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        {movie && <MovieModalBody movie={movie} />}
      </DialogContent>
    </Dialog>
  );
}

function MovieModalBody({ movie }: { movie: Movie }) {
  const review = movie.review;
  const runtime = formatRuntime(movie.runtime);
  const genres = movie.genres ?? [];

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto">
      {/* Backdrop */}
      <div className="relative aspect-video w-full shrink-0 bg-muted">
        <Poster
          src={movie.backdropUrl ?? movie.posterUrl}
          alt={movie.title}
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-popover via-popover/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-3 p-5">
          <div className="min-w-0">
            <DialogTitle className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {movie.title}
            </DialogTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {movie.releaseYear && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" /> {movie.releaseYear}
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {runtime}
                </span>
              )}
              {movie.ageRating && <span className="rounded border border-border px-1.5">{movie.ageRating}</span>}
            </div>
          </div>
          {review?.rating != null && <MovieRating rating={review.rating} size="lg" className="ml-auto" />}
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-5 p-5 sm:p-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <TrailerButton url={movie.trailerUrl} title={movie.title} />
          <MyListButton movieId={movie.id} />
          <Link
            href={`/movies/${movie.slug}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-border px-4 text-sm font-medium transition-ui hover:bg-accent"
          >
            Full review <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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

        {/* My verdict */}
        {review && (review.verdict || review.recommendationType || review.rating != null) && (
          <section className="rounded-card border border-border bg-background/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My verdict</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {review.rating != null && (
                <span className="font-display text-2xl font-bold">
                  {review.rating.toFixed(1)}
                  <span className="text-base font-normal text-muted-foreground"> / 10</span>
                </span>
              )}
              <RecommendationBadge type={review.recommendationType} />
            </div>
            {review.verdict && <p className="mt-2 text-sm text-foreground">{review.verdict}</p>}
          </section>
        )}

        {/* Short review */}
        {review?.shortReview && (
          <p className="text-sm leading-relaxed text-muted-foreground">{review.shortReview}</p>
        )}

        {/* Why I recommend it */}
        {review?.whyRecommend && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why I recommend it
            </h3>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
              {review.whyRecommend}
            </p>
          </section>
        )}

        {/* Overview fallback when there's no editorial yet */}
        {!review?.shortReview && !review?.whyRecommend && movie.overview && (
          <p className="text-sm leading-relaxed text-muted-foreground">{movie.overview}</p>
        )}

        {/* Credits */}
        <dl className="grid gap-2 text-sm">
          {movie.director && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Director</dt>
              <dd className="text-foreground">{movie.director}</dd>
            </div>
          )}
          {movie.cast.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Cast</dt>
              <dd className="text-foreground">{movie.cast.slice(0, 6).map((c) => c.name).join(", ")}</dd>
            </div>
          )}
        </dl>

        <Link
          href={`/movies/${movie.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Read the full review <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
