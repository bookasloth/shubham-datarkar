// Movie recommendation module — types, mappers, and configurable vocab.
// Hand-written per project convention (no Supabase codegen). camelCase app
// types + snake_case row types + a mapRow() per entity, mirroring lib/gallery.

/* ------------------------------ Vocab ------------------------------ */
// Configurable editorial vocab. Kept in TS (not a DB enum) so new values ship
// without a migration; the admin form reads these arrays for its selects.

export const RECOMMENDATION_TYPES = [
  "Must Watch",
  "Highly Recommended",
  "Worth Watching",
  "Hidden Gem",
  "Underrated",
  "Classic",
  "Watch If You Have Time",
  "Skip It",
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const MOODS = [
  "Feel Good",
  "Dark",
  "Mind-Bending",
  "Emotional",
  "Funny",
  "Relaxing",
  "Intense",
  "Inspirational",
  "Tense",
  "Wholesome",
  "Thought-Provoking",
  "Nostalgic",
] as const;
export type Mood = (typeof MOODS)[number];

export type CastMember = {
  name: string;
  character?: string;
  profilePath?: string | null;
};

/* ------------------------------ App types ------------------------------ */

export type Genre = { id: string; name: string; slug: string };

export type Review = {
  id: string;
  movieId: string;
  rating: number | null;
  verdict: string | null;
  recommendationType: string | null;
  shortReview: string | null;
  fullReview: string | null;
  whyRecommend: string | null;
  bestFor: string | null;
  watchIf: string | null;
  notFor: string | null;
  spoilerFree: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Movie = {
  id: string;
  title: string;
  slug: string;
  overview: string | null;
  tagline: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  runtime: number | null;
  originalLanguage: string | null;
  country: string | null;
  director: string | null;
  cast: CastMember[];
  moods: string[];
  ageRating: string | null;
  tmdbId: number | null;
  externalSource: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined on demand:
  genres?: Genre[];
  review?: Review | null;
};

export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  // Joined on demand:
  movieCount?: number;
  movies?: Movie[];
};

export type HomepageSectionKind = "hero" | "collection" | "auto";
export type AutoFeed = "recently_added" | "top_rated" | "must_watch";

export type HomepageSection = {
  id: string;
  title: string;
  kind: HomepageSectionKind;
  collectionId: string | null;
  movieId: string | null;
  autoFeed: string | null;
  isEnabled: boolean;
  displayOrder: number;
};

/* ------------------------------ Row types ------------------------------ */

export type GenreRow = { id: string; name: string; slug: string };

export type ReviewRow = {
  id: string;
  movie_id: string;
  rating: number | null;
  verdict: string | null;
  recommendation_type: string | null;
  short_review: string | null;
  full_review: string | null;
  why_recommend: string | null;
  best_for: string | null;
  watch_if: string | null;
  not_for: string | null;
  spoiler_free: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type MovieRow = {
  id: string;
  title: string;
  slug: string;
  overview: string | null;
  tagline: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  release_date: string | null;
  release_year: number | null;
  runtime: number | null;
  original_language: string | null;
  country: string | null;
  director: string | null;
  movie_cast: CastMember[] | null;
  moods: string[] | null;
  age_rating: string | null;
  tmdb_id: number | null;
  external_source: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CollectionRow = {
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

export type HomepageSectionRow = {
  id: string;
  title: string;
  kind: HomepageSectionKind;
  collection_id: string | null;
  movie_id: string | null;
  auto_feed: string | null;
  is_enabled: boolean;
  display_order: number;
};

/* ------------------------------ SELECT strings ------------------------------ */

export const MOVIE_SELECT =
  "id, title, slug, overview, tagline, poster_url, backdrop_url, trailer_url, release_date, release_year, runtime, original_language, country, director, movie_cast, moods, age_rating, tmdb_id, external_source, is_published, created_at, updated_at";

export const REVIEW_SELECT =
  "id, movie_id, rating, verdict, recommendation_type, short_review, full_review, why_recommend, best_for, watch_if, not_for, spoiler_free, published, created_at, updated_at";

export const COLLECTION_SELECT =
  "id, title, slug, description, cover_url, is_published, display_order, created_at, updated_at";

export const GENRE_SELECT = "id, name, slug";

export const HOMEPAGE_SECTION_SELECT =
  "id, title, kind, collection_id, movie_id, auto_feed, is_enabled, display_order";

/* ------------------------------ Mappers ------------------------------ */

export function mapGenreRow(r: GenreRow): Genre {
  return { id: r.id, name: r.name, slug: r.slug };
}

export function mapReviewRow(r: ReviewRow): Review {
  return {
    id: r.id,
    movieId: r.movie_id,
    rating: r.rating,
    verdict: r.verdict,
    recommendationType: r.recommendation_type,
    shortReview: r.short_review,
    fullReview: r.full_review,
    whyRecommend: r.why_recommend,
    bestFor: r.best_for,
    watchIf: r.watch_if,
    notFor: r.not_for,
    spoilerFree: r.spoiler_free,
    published: r.published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapMovieRow(r: MovieRow): Movie {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    overview: r.overview,
    tagline: r.tagline,
    posterUrl: r.poster_url,
    backdropUrl: r.backdrop_url,
    trailerUrl: r.trailer_url,
    releaseDate: r.release_date,
    releaseYear: r.release_year,
    runtime: r.runtime,
    originalLanguage: r.original_language,
    country: r.country,
    director: r.director,
    cast: Array.isArray(r.movie_cast) ? r.movie_cast : [],
    moods: r.moods ?? [],
    ageRating: r.age_rating,
    tmdbId: r.tmdb_id,
    externalSource: r.external_source,
    isPublished: r.is_published,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapCollectionRow(r: CollectionRow): Collection {
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

export function mapHomepageSectionRow(r: HomepageSectionRow): HomepageSection {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind,
    collectionId: r.collection_id,
    movieId: r.movie_id,
    autoFeed: r.auto_feed,
    isEnabled: r.is_enabled,
    displayOrder: r.display_order,
  };
}

/* ------------------------------ Helpers ------------------------------ */

/** URL-safe slug from a title. Empty → "movie" so the column is never blank. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "movie"
  );
}

/** Runtime "148" → "2h 28m". Null/0 → "". */
export function formatRuntime(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
}
