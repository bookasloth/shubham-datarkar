"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookWithRelations } from "@/lib/books/types";
import { useBooks } from "./books-context";
import { Poster } from "@/components/movies/poster";
import { MovieRating } from "@/components/movies/movie-rating";
import { RecommendationBadge } from "@/components/movies/recommendation-badge";
import { ReadingStatusBadge } from "./reading-status-badge";
import { BookProgress } from "./book-progress";
import { MyBookListButton } from "./my-book-list-button";

/**
 * Cover card. An anchor to the full page (works without JS / opens in a new
 * tab), but a plain click opens the detail modal instead. Title stays visible
 * below the cover — the hover overlay is enhancement only.
 */
export function BookCard({ book, className }: { book: BookWithRelations; className?: string }) {
  const { open } = useBooks();
  const review = book.review;
  const line = review?.shortReview || review?.verdict || book.subtitle;
  const currentlyReading = book.reading?.status === "currently_reading";

  return (
    <Link
      href={`/books/${book.slug}`}
      aria-label={book.title}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        open(book);
      }}
      className={cn(
        "group/card block outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-img border border-border bg-muted">
        <Poster
          src={book.coverUrl}
          alt={book.title}
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

        {currentlyReading && (
          <div className="absolute inset-x-2 bottom-2 space-y-1">
            <ReadingStatusBadge status={book.reading?.status ?? null} />
            <BookProgress percentage={book.reading?.percentage ?? null} />
          </div>
        )}

        {/* Hover overlay (desktop enhancement) */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          {line && <p className="line-clamp-3 text-xs leading-snug text-white/90">{line}</p>}
          <div className="pointer-events-auto mt-2 flex items-center gap-1.5">
            <MyBookListButton bookId={book.id} iconOnly size="icon-sm" variant="secondary" />
            <button
              type="button"
              aria-label={`More info about ${book.title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                open(book);
              }}
              className="flex size-8 items-center justify-center rounded-btn bg-secondary text-secondary-foreground transition-ui hover:bg-accent [&_svg]:size-3.5"
            >
              <Info aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Title + author (always visible — no hover dependency) */}
      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{book.title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{book.author}</p>
      </div>
    </Link>
  );
}
