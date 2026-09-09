// Books / Reading module — types, mappers, and configurable vocab.
// Hand-written per project convention (no Supabase codegen). camelCase app
// types + snake_case row types + a mapRow() per entity, mirroring lib/movies.

/* ------------------------------ Vocab ------------------------------ */
// Configurable editorial vocab. Kept in TS (not a DB enum) so new values ship
// without a migration; the admin form reads these arrays for its selects.

export const RECOMMENDATION_TYPES = [
  "Must Read",
  "Highly Recommended",
  "Recommended",
  "Worth Reading",
  "Hidden Gem",
  "Underrated",
  "Re-read Worthy",
  "Read If Interested",
  "Not For Me",
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

// Mirrors the book_reading.status check constraint (migration 20260909000001).
export const READING_STATUSES = [
  "want_to_read",
  "currently_reading",
  "paused",
  "finished",
  "abandoned",
] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const MOODS = [
  "Thought-Provoking",
  "Practical",
  "Easy Read",
  "Dense",
  "Inspirational",
  "Challenging",
  "Emotional",
  "Technical",
  "Entertaining",
  "Life-Changing",
] as const;
export type Mood = (typeof MOODS)[number];

/* ------------------------------ App types ------------------------------ */

export type Genre = { id: string; name: string; slug: string };

export type Book = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  author: string | null;
  authors: string[];
  coverUrl: string | null;
  backdropUrl: string | null;
  isbn: string | null;
  publisher: string | null;
  publicationDate: string | null;
  publicationYear: number | null;
  pageCount: number | null;
  language: string | null;
  country: string | null;
  moods: string[];
  googleId: string | null;
  externalSource: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookReading = {
  id: string;
  bookId: string;
  status: string;
  currentPage: number | null;
  totalPages: number | null;
  percentage: number | null;
  startedAt: string | null;
  lastReadAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookReview = {
  id: string;
  bookId: string;
  rating: number | null;
  verdict: string | null;
  recommendationType: string | null;
  shortReview: string | null;
  fullReview: string | null;
  whyRead: string | null;
  whyRecommend: string | null;
  whatILearned: string | null;
  whoShouldRead: string | null;
  whoShouldNotRead: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookNote = {
  id: string;
  bookId: string;
  chapter: string | null;
  page: number | null;
  quote: string | null;
  note: string | null;
  tags: string[];
  position: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookCollection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BookPage = {
  id: string;
  bookId: string;
  position: number;
  pageType: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookWithRelations = Book & {
  reading: BookReading | null;
  review: BookReview | null;
  genres: { id: string; name: string; slug: string }[];
};

/* ------------------------------ Row types ------------------------------ */

export type GenreRow = { id: string; name: string; slug: string };

export type BookRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  author: string | null;
  authors: string[] | null;
  cover_url: string | null;
  backdrop_url: string | null;
  isbn: string | null;
  publisher: string | null;
  publication_date: string | null;
  publication_year: number | null;
  page_count: number | null;
  language: string | null;
  country: string | null;
  moods: string[] | null;
  google_id: string | null;
  external_source: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type BookReadingRow = {
  id: string;
  book_id: string;
  status: string;
  current_page: number | null;
  total_pages: number | null;
  percentage: number | null;
  started_at: string | null;
  last_read_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookReviewRow = {
  id: string;
  book_id: string;
  rating: number | null;
  verdict: string | null;
  recommendation_type: string | null;
  short_review: string | null;
  full_review: string | null;
  why_read: string | null;
  why_recommend: string | null;
  what_i_learned: string | null;
  who_should_read: string | null;
  who_should_not_read: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type BookNoteRow = {
  id: string;
  book_id: string;
  chapter: string | null;
  page: number | null;
  quote: string | null;
  note: string | null;
  tags: string[] | null;
  position: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type BookCollectionRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type BookPageRow = {
  id: string;
  book_id: string;
  position: number;
  page_type: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/* ------------------------------ SELECT strings ------------------------------ */

export const BOOK_SELECT =
  "id, title, slug, subtitle, description, author, authors, cover_url, backdrop_url, isbn, publisher, publication_date, publication_year, page_count, language, country, moods, google_id, external_source, is_published, created_at, updated_at";

export const BOOK_READING_SELECT =
  "id, book_id, status, current_page, total_pages, percentage, started_at, last_read_at, finished_at, created_at, updated_at";

export const BOOK_REVIEW_SELECT =
  "id, book_id, rating, verdict, recommendation_type, short_review, full_review, why_read, why_recommend, what_i_learned, who_should_read, who_should_not_read, published, created_at, updated_at";

export const BOOK_NOTE_SELECT =
  "id, book_id, chapter, page, quote, note, tags, position, published, created_at, updated_at";

export const BOOK_COLLECTION_SELECT =
  "id, title, slug, description, cover_url, is_published, display_order, created_at, updated_at";

export const BOOK_PAGE_SELECT =
  "id, book_id, position, page_type, title, content, metadata, published, created_at, updated_at";

export const GENRE_SELECT = "id, name, slug";

/* ------------------------------ Mappers ------------------------------ */

export function mapGenreRow(r: GenreRow): Genre {
  return { id: r.id, name: r.name, slug: r.slug };
}

export function mapBookRow(r: BookRow): Book {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    subtitle: r.subtitle,
    description: r.description,
    author: r.author,
    authors: Array.isArray(r.authors) ? r.authors : [],
    coverUrl: r.cover_url,
    backdropUrl: r.backdrop_url,
    isbn: r.isbn,
    publisher: r.publisher,
    publicationDate: r.publication_date,
    publicationYear: r.publication_year,
    pageCount: r.page_count,
    language: r.language,
    country: r.country,
    moods: r.moods ?? [],
    googleId: r.google_id,
    externalSource: r.external_source,
    isPublished: r.is_published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapReadingRow(r: BookReadingRow): BookReading {
  return {
    id: r.id,
    bookId: r.book_id,
    status: r.status,
    currentPage: r.current_page,
    totalPages: r.total_pages,
    percentage: r.percentage,
    startedAt: r.started_at,
    lastReadAt: r.last_read_at,
    finishedAt: r.finished_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapReviewRow(r: BookReviewRow): BookReview {
  return {
    id: r.id,
    bookId: r.book_id,
    rating: r.rating,
    verdict: r.verdict,
    recommendationType: r.recommendation_type,
    shortReview: r.short_review,
    fullReview: r.full_review,
    whyRead: r.why_read,
    whyRecommend: r.why_recommend,
    whatILearned: r.what_i_learned,
    whoShouldRead: r.who_should_read,
    whoShouldNotRead: r.who_should_not_read,
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapNoteRow(r: BookNoteRow): BookNote {
  return {
    id: r.id,
    bookId: r.book_id,
    chapter: r.chapter,
    page: r.page,
    quote: r.quote,
    note: r.note,
    tags: r.tags ?? [],
    position: r.position,
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapCollectionRow(r: BookCollectionRow): BookCollection {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    coverUrl: r.cover_url,
    isPublished: r.is_published,
    displayOrder: r.display_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapPageRow(r: BookPageRow): BookPage {
  return {
    id: r.id,
    bookId: r.book_id,
    position: r.position,
    pageType: r.page_type,
    title: r.title,
    content: r.content,
    metadata: r.metadata ?? {},
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------ Helpers ------------------------------ */

/** URL-safe slug from a title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Reading percentage. 100 when finished; else current/total rounded, clamped 0-100. */
export function computePercentage(
  currentPage: number | null,
  totalPages: number | null,
  status: string,
): number | null {
  if (status === "finished") return 100;
  if (!currentPage || !totalPages || totalPages <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100)));
}
