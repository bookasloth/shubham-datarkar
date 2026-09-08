import { supabaseAnon, supabaseAdmin, createClient } from "@/lib/supabase/server";
import {
  MOVIE_SELECT,
  REVIEW_SELECT,
  GENRE_SELECT,
  COLLECTION_SELECT,
  HOMEPAGE_SECTION_SELECT,
  mapMovieRow,
  mapReviewRow,
  mapGenreRow,
  mapCollectionRow,
  mapHomepageSectionRow,
  type Movie,
  type MovieRow,
  type ReviewRow,
  type GenreRow,
  type Genre,
  type Collection,
  type CollectionRow,
  type HomepageSection,
  type HomepageSectionRow,
} from "./types";

// Movie carries its genres + editorial review. We stitch relations rather than
// fight PostgREST embedding ordering — the catalogue is small and this stays
// predictable (mirrors gallery's decorateAlbums approach).
const MOVIE_WITH_RELATIONS = `${MOVIE_SELECT}, movie_genres(genre:genres(${GENRE_SELECT})), reviews(${REVIEW_SELECT})`;

type MovieRelRow = MovieRow & {
  movie_genres?: Array<{ genre: GenreRow | GenreRow[] | null }> | null;
  // PostgREST returns a to-one embed as an object; reviews.movie_id is UNIQUE
  // (1:1), so `reviews` comes back as a single object, not an array.
  reviews?: ReviewRow | ReviewRow[] | null;
};

function mapMovieWithRelations(row: MovieRelRow): Movie {
  const movie = mapMovieRow(row);
  movie.genres = (row.movie_genres ?? [])
    .map((g) => {
      const genre = Array.isArray(g.genre) ? g.genre[0] : g.genre;
      return genre ? mapGenreRow(genre) : null;
    })
    .filter((g): g is Genre => g !== null);
  const review = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews;
  movie.review = review ? mapReviewRow(review) : null;
  return movie;
}

// ===========================================================================
// PUBLIC READS (anon client, RLS-bound, fail soft to empty for prerender)
// ===========================================================================

/** Published movies, newest first. RLS returns only published reviews embedded. */
export async function getPublishedMovies(limit = 60): Promise<Movie[]> {
  const { data, error } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[movies] published list failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as MovieRelRow[]).map(mapMovieWithRelations);
}

/** One published movie by slug, with genres + published review. */
export async function getPublishedMovieBySlug(slug: string): Promise<Movie | null> {
  const { data, error } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[movies] movie-by-slug failed:", error.message);
    return null;
  }
  return data ? mapMovieWithRelations(data as unknown as MovieRelRow) : null;
}

/** Slugs of every published movie — for generateStaticParams / sitemap. */
export async function getPublishedMovieSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data, error } = await supabaseAnon()
    .from("movies")
    .select("slug, updated_at")
    .eq("is_published", true);
  if (error) return [];
  return ((data ?? []) as { slug: string; updated_at: string }[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}

/** Movies similar to `movie`: share ≥1 genre, exclude self, newest first. */
export async function getSimilarMovies(movie: Movie, limit = 12): Promise<Movie[]> {
  const genreIds = (movie.genres ?? []).map((g) => g.id);
  if (genreIds.length === 0) return [];
  const { data, error } = await supabaseAnon()
    .from("movie_genres")
    .select("movie_id")
    .in("genre_id", genreIds);
  if (error) return [];
  const ids = [...new Set((data ?? []).map((r) => (r as { movie_id: string }).movie_id))].filter(
    (id) => id !== movie.id,
  );
  if (ids.length === 0) return [];
  const { data: movies } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .in("id", ids)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((movies ?? []) as unknown as MovieRelRow[]).map(mapMovieWithRelations);
}

/* ------------------------------ Auto feeds ------------------------------ */

/** Recently added published movies. */
export async function getRecentlyAdded(limit = 20): Promise<Movie[]> {
  return getPublishedMovies(limit);
}

/** Published movies with a review, sorted by rating desc. */
export async function getTopRated(limit = 20): Promise<Movie[]> {
  const all = await getPublishedMovies(200);
  return all
    .filter((m) => m.review?.rating != null)
    .sort((a, b) => (b.review!.rating ?? 0) - (a.review!.rating ?? 0))
    .slice(0, limit);
}

/** Published movies tagged "Must Watch" in their review. */
export async function getMustWatch(limit = 20): Promise<Movie[]> {
  const all = await getPublishedMovies(200);
  return all.filter((m) => m.review?.recommendationType === "Must Watch").slice(0, limit);
}

async function resolveAutoFeed(feed: string | null, limit = 20): Promise<Movie[]> {
  switch (feed) {
    case "top_rated":
      return getTopRated(limit);
    case "must_watch":
      return getMustWatch(limit);
    case "recently_added":
    default:
      return getRecentlyAdded(limit);
  }
}

/* ------------------------------ Collections ------------------------------ */

/** Published collections in display order, with a live movie count. */
export async function getPublishedCollections(): Promise<Collection[]> {
  const { data, error } = await supabaseAnon()
    .from("collections")
    .select(COLLECTION_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[movies] collections failed:", error.message);
    return [];
  }
  const collections = ((data ?? []) as CollectionRow[]).map(mapCollectionRow);
  // Tally membership in one round-trip.
  const { data: links } = await supabaseAnon().from("collection_movies").select("collection_id");
  const counts = new Map<string, number>();
  for (const l of (links ?? []) as { collection_id: string }[]) {
    counts.set(l.collection_id, (counts.get(l.collection_id) ?? 0) + 1);
  }
  return collections.map((c) => ({ ...c, movieCount: counts.get(c.id) ?? 0 }));
}

export async function getPublishedCollectionBySlug(slug: string): Promise<Collection | null> {
  const { data, error } = await supabaseAnon()
    .from("collections")
    .select(COLLECTION_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  const collection = mapCollectionRow(data as CollectionRow);
  collection.movies = await getMoviesInCollection(collection.id);
  collection.movieCount = collection.movies.length;
  return collection;
}

export async function getPublishedCollectionSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data, error } = await supabaseAnon()
    .from("collections")
    .select("slug, updated_at")
    .eq("is_published", true);
  if (error) return [];
  return ((data ?? []) as { slug: string; updated_at: string }[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}

/** Published movies in a collection, in the collection's saved order. */
export async function getMoviesInCollection(collectionId: string): Promise<Movie[]> {
  const { data: links, error } = await supabaseAnon()
    .from("collection_movies")
    .select("movie_id, sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true });
  if (error || !links || links.length === 0) return [];
  const orderedIds = (links as { movie_id: string; sort_order: number }[]).map((l) => l.movie_id);
  const { data: movies } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .in("id", orderedIds)
    .eq("is_published", true);
  const byId = new Map(((movies ?? []) as unknown as MovieRelRow[]).map((m) => [m.id, mapMovieWithRelations(m)]));
  return orderedIds.map((id) => byId.get(id)).filter((m): m is Movie => m != null);
}

/** Published collections that contain this movie — "related collections". */
export async function getCollectionsContainingMovie(movieId: string): Promise<Collection[]> {
  const { data: links } = await supabaseAnon()
    .from("collection_movies")
    .select("collection_id")
    .eq("movie_id", movieId);
  const ids = [...new Set((links ?? []).map((l) => (l as { collection_id: string }).collection_id))];
  if (ids.length === 0) return [];
  const { data } = await supabaseAnon()
    .from("collections")
    .select(COLLECTION_SELECT)
    .in("id", ids)
    .eq("is_published", true)
    .order("display_order", { ascending: true });
  return ((data ?? []) as CollectionRow[]).map(mapCollectionRow);
}

/* ------------------------------ Genres ------------------------------ */

export async function getGenres(): Promise<Genre[]> {
  const { data, error } = await supabaseAnon().from("genres").select(GENRE_SELECT).order("name");
  if (error) return [];
  return ((data ?? []) as GenreRow[]).map(mapGenreRow);
}

export async function getGenreBySlug(slug: string): Promise<Genre | null> {
  const { data } = await supabaseAnon().from("genres").select(GENRE_SELECT).eq("slug", slug).maybeSingle();
  return data ? mapGenreRow(data as GenreRow) : null;
}

/** Published movies in a genre. */
export async function getMoviesByGenre(genreId: string, limit = 60): Promise<Movie[]> {
  const { data: links } = await supabaseAnon()
    .from("movie_genres")
    .select("movie_id")
    .eq("genre_id", genreId);
  const ids = (links ?? []).map((l) => (l as { movie_id: string }).movie_id);
  if (ids.length === 0) return [];
  const { data } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .in("id", ids)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as MovieRelRow[]).map(mapMovieWithRelations);
}

/* ------------------------------ Search ------------------------------ */

/**
 * Search published movies by title, director, cast, genre, or mood.
 * ponytail: in-memory filter over the published set — fine for a hand-curated
 * catalogue. Swap to Postgres full-text search if it ever grows past a few hundred.
 */
export async function searchPublishedMovies(query: string): Promise<Movie[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getPublishedMovies(500);
  return all.filter((m) => {
    if (m.title.toLowerCase().includes(q)) return true;
    if (m.director?.toLowerCase().includes(q)) return true;
    if (m.cast.some((c) => c.name.toLowerCase().includes(q))) return true;
    if ((m.genres ?? []).some((g) => g.name.toLowerCase().includes(q))) return true;
    if (m.moods.some((mood) => mood.toLowerCase().includes(q))) return true;
    return false;
  });
}

/* ------------------------------ Homepage ------------------------------ */

export type ResolvedHomepageSection = {
  section: HomepageSection;
  hero: Movie | null;
  collectionSlug: string | null;
  movies: Movie[];
};

/** Enabled homepage sections in order, each with its resolved content. */
export async function getHomepageSections(): Promise<ResolvedHomepageSection[]> {
  const { data, error } = await supabaseAnon()
    .from("homepage_sections")
    .select(HOMEPAGE_SECTION_SELECT)
    .eq("is_enabled", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[movies] homepage sections failed:", error.message);
    return [];
  }
  const sections = ((data ?? []) as HomepageSectionRow[]).map(mapHomepageSectionRow);
  return Promise.all(
    sections.map(async (section): Promise<ResolvedHomepageSection> => {
      if (section.kind === "hero") {
        const hero = section.movieId ? await getPublishedMovieById(section.movieId) : null;
        return { section, hero, collectionSlug: null, movies: [] };
      }
      if (section.kind === "collection" && section.collectionId) {
        const movies = await getMoviesInCollection(section.collectionId);
        const slug = await collectionSlugById(section.collectionId);
        return { section, hero: null, collectionSlug: slug, movies };
      }
      const movies = await resolveAutoFeed(section.autoFeed);
      return { section, hero: null, collectionSlug: null, movies };
    }),
  );
}

async function getPublishedMovieById(id: string): Promise<Movie | null> {
  const { data } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return data ? mapMovieWithRelations(data as unknown as MovieRelRow) : null;
}

async function collectionSlugById(id: string): Promise<string | null> {
  const { data } = await supabaseAnon().from("collections").select("slug").eq("id", id).maybeSingle();
  return data ? (data as { slug: string }).slug : null;
}

// ===========================================================================
// MY LIST (session client — each user reads only their own rows via RLS)
// ===========================================================================

/** The current user's id, or null when logged out. */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Movie ids the current user has saved. Empty when logged out. */
export async function getMyListMovieIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase.from("user_movie_list").select("movie_id").eq("user_id", user.id);
  return new Set((data ?? []).map((r) => (r as { movie_id: string }).movie_id));
}

/** The current user's saved movies (full), newest save first. */
export async function getMyListMovies(): Promise<Movie[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: links } = await supabase
    .from("user_movie_list")
    .select("movie_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const ids = (links ?? []).map((l) => (l as { movie_id: string }).movie_id);
  if (ids.length === 0) return [];
  const { data: movies } = await supabaseAnon()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .in("id", ids)
    .eq("is_published", true);
  const byId = new Map(((movies ?? []) as unknown as MovieRelRow[]).map((m) => [m.id, mapMovieWithRelations(m)]));
  return ids.map((id) => byId.get(id)).filter((m): m is Movie => m != null);
}

export async function isLoggedIn(): Promise<boolean> {
  return (await currentUserId()) !== null;
}

// ===========================================================================
// ADMIN READS (service role, bypasses RLS — includes drafts)
// ===========================================================================

export async function getAllMoviesAdmin(): Promise<Movie[]> {
  const { data, error } = await supabaseAdmin()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as MovieRelRow[]).map(mapMovieWithRelations);
}

export async function getMovieByIdAdmin(id: string): Promise<Movie | null> {
  const { data, error } = await supabaseAdmin()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMovieWithRelations(data as unknown as MovieRelRow) : null;
}

export async function getMovieByTmdbIdAdmin(tmdbId: number): Promise<{ id: string; slug: string } | null> {
  const { data } = await supabaseAdmin()
    .from("movies")
    .select("id, slug")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  return (data as { id: string; slug: string } | null) ?? null;
}

export async function getAllCollectionsAdmin(): Promise<Collection[]> {
  const { data, error } = await supabaseAdmin()
    .from("collections")
    .select(COLLECTION_SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const collections = ((data ?? []) as CollectionRow[]).map(mapCollectionRow);
  const { data: links } = await supabaseAdmin().from("collection_movies").select("collection_id");
  const counts = new Map<string, number>();
  for (const l of (links ?? []) as { collection_id: string }[]) {
    counts.set(l.collection_id, (counts.get(l.collection_id) ?? 0) + 1);
  }
  return collections.map((c) => ({ ...c, movieCount: counts.get(c.id) ?? 0 }));
}

export async function getCollectionByIdAdmin(id: string): Promise<Collection | null> {
  const { data, error } = await supabaseAdmin()
    .from("collections")
    .select(COLLECTION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const collection = mapCollectionRow(data as CollectionRow);
  collection.movies = await getMoviesInCollectionAdmin(id);
  return collection;
}

/** Movies in a collection (drafts included), in saved order — the admin editor. */
export async function getMoviesInCollectionAdmin(collectionId: string): Promise<Movie[]> {
  const { data: links } = await supabaseAdmin()
    .from("collection_movies")
    .select("movie_id, sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true });
  if (!links || links.length === 0) return [];
  const orderedIds = (links as { movie_id: string }[]).map((l) => l.movie_id);
  const { data: movies } = await supabaseAdmin()
    .from("movies")
    .select(MOVIE_WITH_RELATIONS)
    .in("id", orderedIds);
  const byId = new Map(((movies ?? []) as unknown as MovieRelRow[]).map((m) => [m.id, mapMovieWithRelations(m)]));
  return orderedIds.map((id) => byId.get(id)).filter((m): m is Movie => m != null);
}

/** Genre ids attached to a movie — prefills the admin form checkboxes. */
export async function getMovieGenreIdsAdmin(movieId: string): Promise<string[]> {
  const { data } = await supabaseAdmin().from("movie_genres").select("genre_id").eq("movie_id", movieId);
  return (data ?? []).map((r) => (r as { genre_id: string }).genre_id);
}

/** Collection ids a movie belongs to — prefills the admin form. */
export async function getMovieCollectionIdsAdmin(movieId: string): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("collection_movies")
    .select("collection_id")
    .eq("movie_id", movieId);
  return (data ?? []).map((r) => (r as { collection_id: string }).collection_id);
}

export async function getAllGenresAdmin(): Promise<Genre[]> {
  const { data, error } = await supabaseAdmin().from("genres").select(GENRE_SELECT).order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as GenreRow[]).map(mapGenreRow);
}
