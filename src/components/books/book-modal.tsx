"use client";

import Link from "next/link";
import { ArrowRight, User, NotebookText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BookWithRelations } from "@/lib/books/types";
import { Poster } from "@/components/movies/poster";
import { MovieRating } from "@/components/movies/movie-rating";
import { RecommendationBadge } from "@/components/movies/recommendation-badge";
import { ReadingStatusBadge } from "./reading-status-badge";
import { BookProgress } from "./book-progress";
import { MyBookListButton } from "./my-book-list-button";

/** Large cinematic detail modal shown before navigating to the full page. */
export function BookModal({ book, onClose }: { book: BookWithRelations | null; onClose: () => void }) {
  return (
    <Dialog open={!!book} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        {book && <BookModalBody book={book} />}
      </DialogContent>
    </Dialog>
  );
}

function BookModalBody({ book }: { book: BookWithRelations }) {
  const review = book.review;
  const genres = book.genres ?? [];

  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto">
      {/* Backdrop */}
      <div className="relative aspect-video w-full shrink-0 bg-muted">
        <Poster
          src={book.backdropUrl ?? book.coverUrl}
          alt={book.title}
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-popover via-popover/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-3 p-5">
          <div className="min-w-0">
            <DialogTitle className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {book.title}
            </DialogTitle>
            {book.author && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3" /> {book.author}
              </div>
            )}
          </div>
          {review?.rating != null && <MovieRating rating={review.rating} size="lg" className="ml-auto" />}
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-5 p-5 sm:p-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <MyBookListButton bookId={book.id} />
          <Link
            href={`/books/${book.slug}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-border px-4 text-sm font-medium transition-ui hover:bg-accent"
          >
            Full review <ArrowRight className="size-4" />
          </Link>
          <Link
            href={`/books/${book.slug}/notes`}
            className="inline-flex h-10 items-center gap-1.5 rounded-btn border border-border px-4 text-sm font-medium transition-ui hover:bg-accent"
          >
            <NotebookText className="size-4" /> Notes
          </Link>
        </div>

        {/* Status + progress */}
        {book.reading?.status && (
          <div className="flex flex-wrap items-center gap-3">
            <ReadingStatusBadge status={book.reading.status} />
            <BookProgress percentage={book.reading.percentage} className="max-w-[10rem]" />
          </div>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <span
                key={g.id}
                className="rounded-btn border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {g.name}
              </span>
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

        {/* Description fallback when there's no editorial yet */}
        {!review?.shortReview && !review?.whyRecommend && book.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{book.description}</p>
        )}

        <Link
          href={`/books/${book.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Read the full review <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
