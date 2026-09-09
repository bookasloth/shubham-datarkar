import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import type { BookWithRelations } from "@/lib/books/types";
import { Poster } from "@/components/movies/poster";
import { MovieRating } from "@/components/movies/movie-rating";
import { RecommendationBadge } from "@/components/movies/recommendation-badge";
import { ReadingStatusBadge } from "./reading-status-badge";
import { BookProgress } from "./book-progress";
import { MyBookListButton } from "./my-book-list-button";

/**
 * Cinematic hero. Server-rendered for LCP/SEO; only the list button is a
 * client island. A bottom gradient keeps the text legible over art.
 */
export function BookHero({ book }: { book: BookWithRelations }) {
  const review = book.review;
  const blurb = review?.shortReview ?? review?.verdict ?? book.description;

  return (
    <section className="relative isolate overflow-hidden rounded-card border border-border">
      <div className="relative h-[62vh] min-h-[420px] w-full sm:h-[68vh] sm:max-h-[680px]">
        <Poster src={book.backdropUrl ?? book.coverUrl} alt={book.title} sizes="100vw" priority />
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
            {book.title}
          </h1>

          {book.author && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="size-3.5" /> {book.author}
            </div>
          )}

          {book.reading?.status && (
            <div className="mt-3 flex max-w-xs flex-col gap-1.5">
              <ReadingStatusBadge status={book.reading.status} />
              <BookProgress percentage={book.reading.percentage} />
            </div>
          )}

          {blurb && (
            <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-foreground/90 sm:text-base">
              {blurb}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href={`/books/${book.slug}`}
              className="inline-flex h-12 items-center gap-1.5 rounded-btn border border-border bg-background/60 px-6 text-base font-medium backdrop-blur transition-ui hover:bg-accent"
            >
              Read my thoughts <ArrowRight className="size-4" />
            </Link>
            <MyBookListButton bookId={book.id} size="lg" variant="secondary" />
          </div>
        </div>
      </div>
    </section>
  );
}
