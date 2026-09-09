import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, BookOpen, Globe } from "lucide-react";
import { buildMetadata, bookSchema, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getBookBySlug, getSimilarBooks, getPublicNotes, getPublishedBookSlugs } from "@/lib/books/queries";
import { Poster } from "@/components/movies/poster";
import { MovieRating } from "@/components/movies/movie-rating";
import { RecommendationBadge } from "@/components/movies/recommendation-badge";
import { ReadingStatusBadge } from "@/components/books/reading-status-badge";
import { BookProgress } from "@/components/books/book-progress";
import { MyBookListButton } from "@/components/books/my-book-list-button";
import { BookRail } from "@/components/books/book-rail";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPublishedBookSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return buildMetadata({ title: "Book", path: `/books/${slug}`, noIndex: true });

  const description =
    book.review?.shortReview ||
    book.review?.verdict ||
    book.description ||
    `My review of ${book.title}.`;

  const base = buildMetadata({
    title: book.author ? `${book.title} by ${book.author} — My Review` : `${book.title} — My Review`,
    description,
    path: `/books/${book.slug}`,
    type: "article",
    publishedTime: book.createdAt,
    modifiedTime: book.updatedAt,
  });
  const ogImage = book.backdropUrl ?? book.coverUrl;
  return ogImage
    ? { ...base, openGraph: { ...base.openGraph, images: [{ url: ogImage }] } }
    : base;
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const [similar, notes] = await Promise.all([getSimilarBooks(book, 14), getPublicNotes(book.id)]);

  const review = book.review;
  const genres = book.genres ?? [];

  return (
    <article className="space-y-10">
      <JsonLd
        data={[
          bookSchema({
            title: book.title,
            description: book.description ?? review?.shortReview ?? book.title,
            path: `/books/${book.slug}`,
            image: book.backdropUrl ?? book.coverUrl ?? undefined,
            author: book.author,
            isbn: book.isbn,
            numberOfPages: book.pageCount,
            datePublished: book.publicationDate,
            genres: genres.map((g) => g.name),
            review: review ? { rating: review.rating, body: review.shortReview ?? review.verdict } : null,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Books", path: "/books" },
            { name: book.title, path: `/books/${book.slug}` },
          ]),
        ]}
      />

      <Breadcrumb
        items={[
          { label: "Books", href: "/books" },
          { label: book.title },
        ]}
      />

      {/* Hero */}
      <header className="relative overflow-hidden rounded-card border border-border">
        <div className="relative h-[42vh] min-h-[260px] w-full sm:h-[46vh] sm:max-h-[460px]">
          <Poster src={book.backdropUrl ?? book.coverUrl} alt={book.title} sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="relative -mt-24 flex flex-col gap-4 p-5 sm:-mt-28 sm:flex-row sm:items-end sm:p-8">
          <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-img border border-border bg-muted shadow-lg sm:w-40">
            <Poster src={book.coverUrl} alt={book.title} sizes="160px" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {review?.recommendationType && <RecommendationBadge type={review.recommendationType} />}
              {review?.rating != null && <MovieRating rating={review.rating} size="lg" />}
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
              {book.title}
            </h1>
            {book.author && <p className="mt-1 text-sm text-muted-foreground">by {book.author}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ReadingStatusBadge status={book.reading?.status ?? null} />
              <BookProgress percentage={book.reading?.percentage ?? null} className="w-32" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {book.publicationYear && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" /> {book.publicationYear}
                </span>
              )}
              {book.pageCount && (
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="size-3.5" /> {book.pageCount} pages
                </span>
              )}
              {book.language && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5" /> {book.language.toUpperCase()}
                </span>
              )}
            </div>
            {genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/books/genre/${g.slug}`}
                    className="rounded-btn border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <MyBookListButton bookId={book.id} variant="secondary" />
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

          {review?.whyRead && (
            <Prose title="Why I'm Reading It">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.whyRead}</p>
            </Prose>
          )}

          {(review?.shortReview || review?.fullReview) && (
            <Prose title="My Review">
              {review.shortReview && (
                <p className="text-base leading-relaxed text-foreground">{review.shortReview}</p>
              )}
              {review.fullReview && (
                <p className="whitespace-pre-line leading-relaxed text-foreground">{review.fullReview}</p>
              )}
            </Prose>
          )}

          {review?.whyRecommend && (
            <Prose title="Why I Recommend It">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.whyRecommend}</p>
            </Prose>
          )}

          {review?.whatILearned && (
            <Prose title="What I'm Learning">
              <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-foreground">
                {review.whatILearned
                  .split("\n")
                  .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
                  .filter(Boolean)
                  .map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </Prose>
          )}

          {review?.whoShouldRead && (
            <Prose title="Who Should Read This">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.whoShouldRead}</p>
            </Prose>
          )}

          {review?.whoShouldNotRead && (
            <Prose title="Who Might Not Like It">
              <p className="whitespace-pre-line leading-relaxed text-foreground">{review.whoShouldNotRead}</p>
            </Prose>
          )}

          {!review?.shortReview && !review?.fullReview && book.description && (
            <Prose title="Overview">
              <p className="leading-relaxed text-muted-foreground">{book.description}</p>
            </Prose>
          )}
        </div>

        {/* Info sidebar */}
        <aside className="space-y-6">
          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Book Information
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Info label="Author" value={book.author} />
              <Info label="Publisher" value={book.publisher} />
              <Info
                label="Published"
                value={book.publicationDate ?? (book.publicationYear ? String(book.publicationYear) : null)}
              />
              <Info label="Pages" value={book.pageCount ? String(book.pageCount) : null} />
              <Info label="Language" value={book.language ? book.language.toUpperCase() : null} />
              <Info label="ISBN" value={book.isbn} />
              {genres.length > 0 && <Info label="Genres" value={genres.map((g) => g.name).join(", ")} />}
              {book.moods.length > 0 && <Info label="Moods" value={book.moods.join(", ")} />}
            </dl>
          </section>

          {notes.length > 0 && (
            <section className="rounded-card border border-border bg-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                My Notes
              </h2>
              <ul className="mt-3 space-y-3">
                {notes.slice(0, 3).map((n) => (
                  <li key={n.id} className="text-sm">
                    {(n.chapter || n.page != null) && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {[n.chapter, n.page != null ? `p. ${n.page}` : null].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {n.note && <p className="mt-0.5 line-clamp-3 text-foreground">{n.note}</p>}
                  </li>
                ))}
              </ul>
              <Link
                href={`/books/${book.slug}/notes`}
                className="mt-3 inline-block text-sm text-muted-foreground transition-ui hover:text-foreground"
              >
                Read all notes →
              </Link>
            </section>
          )}
        </aside>
      </div>

      {similar.length > 0 && <BookRail title="Related Books" books={similar} />}
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
