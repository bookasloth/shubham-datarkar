"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/lib/movies/types";
import { useMovies } from "./movies-context";
import { Poster } from "./poster";
import { MovieRating } from "./movie-rating";
import { RecommendationBadge } from "./recommendation-badge";
import { TrailerButton } from "./trailer-button";
import { MyListButton } from "./my-list-button";

/**
 * Poster card. An anchor to the full page (works without JS / opens in a new
 * tab), but a plain click opens the detail modal instead. Title stays visible
 * below the poster — the hover overlay is enhancement only.
 */
export function MovieCard({ movie, className }: { movie: Movie; className?: string }) {
  const { open } = useMovies();
  const review = movie.review;
  const line = review?.shortReview || review?.verdict || movie.tagline;

  return (
    <Link
      href={`/movies/${movie.slug}`}
      aria-label={`${movie.title}${movie.releaseYear ? ` (${movie.releaseYear})` : ""}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        open(movie);
      }}
      className={cn(
        "group/card block outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-img border border-border bg-muted">
        <Poster
          src={movie.posterUrl}
          alt={movie.title}
          className="transition-transform duration-300 ease-out group-hover/card:scale-105"
        />

        {/* Corner badges (always visible) */}
        {review?.recommendationType && (
          <span className="absolute left-2 top-2">
            <RecommendationBadge type={review.recommendationType} />
          </span>
        )}
        {review?.rating != null && (
          <span className="absolute right-2 top-2">
            <MovieRating rating={review.rating} />
          </span>
        )}

        {/* Hover overlay (desktop enhancement) */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          {line && (
            <p className="line-clamp-3 text-xs leading-snug text-white/90">
              {line}
            </p>
          )}
          <div className="pointer-events-auto mt-2 flex items-center gap-1.5">
            <TrailerButton
              url={movie.trailerUrl}
              title={movie.title}
              iconOnly
              size="icon-sm"
              variant="secondary"
            />
            <MyListButton movieId={movie.id} iconOnly size="icon-sm" variant="secondary" />
            <button
              type="button"
              aria-label={`More info about ${movie.title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                open(movie);
              }}
              className="flex size-8 items-center justify-center rounded-btn bg-secondary text-secondary-foreground transition-ui hover:bg-accent [&_svg]:size-3.5"
            >
              <Info aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Title (always visible — no hover dependency) */}
      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{movie.title}</p>
        <p className="text-xs text-muted-foreground">
          {[movie.releaseYear, (movie.genres ?? [])[0]?.name].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
