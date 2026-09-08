"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";
import { slugify, type CastMember } from "./types";
import {
  searchMovies,
  getMovieDetails,
  tmdbConfigured,
  type TmdbSearchResult,
  type TmdbMovieDetails,
} from "./tmdb";
import { getMovieByTmdbIdAdmin } from "./queries";

/* ------------------------------ Result types ------------------------------ */

export type ActionResult = { ok: true } | { error: string };
export type SaveMovieResult = { ok: true; id: string; slug: string } | { error: string };
export type SaveCollectionResult = { ok: true; id: string; slug: string } | { error: string };
export type TmdbSearchActionResult = { ok: true; results: TmdbSearchResult[] } | { error: string };
export type TmdbImportResult =
  | { ok: true; details: TmdbMovieDetails; existingSlug: string | null }
  | { error: string };
export type MyListResult = { ok: true; saved: boolean } | { error: string };
export type RefreshArtworkResult =
  | { ok: true; updated: number; skipped: number; failed: number }
  | { error: string };

/* ------------------------------ Input shapes ------------------------------ */

export type ReviewInput = {
  rating?: number | null;
  verdict?: string;
  recommendationType?: string;
  shortReview?: string;
  fullReview?: string;
  whyRecommend?: string;
  bestFor?: string;
  watchIf?: string;
  notFor?: string;
  spoilerFree?: boolean;
  published?: boolean;
};

export type MovieInput = {
  title: string;
  overview?: string;
  tagline?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  releaseDate?: string | null;
  releaseYear?: number | null;
  runtime?: number | null;
  originalLanguage?: string;
  country?: string;
  director?: string;
  ageRating?: string;
  cast?: CastMember[];
  moods?: string[];
  tmdbId?: number | null;
  externalSource?: string;
  isPublished?: boolean;
  genreIds?: string[];
  collectionIds?: string[];
  review?: ReviewInput;
};

/* ------------------------------ Helpers ------------------------------ */

/** Trim + cap a string; null when empty. */
function clean(v: string | undefined | null, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

/** A safe http(s) URL, or null. */
function cleanUrl(v: string | undefined | null): string | null {
  const t = clean(v, 1000);
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : null;
}

function toInt(v: number | null | undefined, min: number, max: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < min || n > max) return null;
  return n;
}

function revalidateMovies(slug?: string): void {
  revalidatePath("/movies");
  revalidatePath("/movies/my-list");
  revalidatePath("/admin/movies");
  if (slug) revalidatePath(`/movies/${slug}`);
}

function revalidateCollections(slug?: string): void {
  revalidatePath("/movies");
  revalidatePath("/collections");
  revalidatePath("/admin/collections");
  if (slug) revalidatePath(`/collections/${slug}`);
}

/** Unique slug from a title within `table`; -2, -3, … on collision. */
async function uniqueSlug(
  admin: ReturnType<typeof supabaseAdmin>,
  table: string,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let q = admin.from(table).select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

/** Normalize + cap a cast array from client input. */
function cleanCast(cast: CastMember[] | undefined): CastMember[] {
  if (!Array.isArray(cast)) return [];
  return cast
    .slice(0, 30)
    .map((c) => ({
      name: String(c?.name ?? "").trim().slice(0, 120),
      character: c?.character ? String(c.character).trim().slice(0, 120) : undefined,
      profilePath: c?.profilePath ? String(c.profilePath).slice(0, 300) : null,
    }))
    .filter((c) => c.name);
}

/* ------------------------------ TMDB import ------------------------------ */

export async function searchTmdb(query: string): Promise<TmdbSearchActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  try {
    const results = await searchMovies(query);
    return { ok: true, results };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "TMDB search failed." };
  }
}

/** Fetch full TMDB metadata to prefill the form; flags an existing import. */
export async function importFromTmdb(tmdbId: number): Promise<TmdbImportResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return { error: "Invalid movie id." };
  try {
    const [details, existing] = await Promise.all([
      getMovieDetails(tmdbId),
      getMovieByTmdbIdAdmin(tmdbId),
    ]);
    return { ok: true, details, existingSlug: existing?.slug ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "TMDB import failed." };
  }
}

type ArtworkRow = {
  id: string;
  title: string;
  release_year: number | null;
  tmdb_id: number | null;
  trailer_url: string | null;
  movie_cast: unknown;
};

/** Resolve one movie's artwork from TMDB → "updated" | "skipped" | "failed". */
async function refreshOne(
  admin: ReturnType<typeof supabaseAdmin>,
  row: ArtworkRow,
): Promise<"updated" | "skipped" | "failed"> {
  try {
    let tmdbId = row.tmdb_id;
    if (!tmdbId) {
      const results = await searchMovies(row.title);
      const match =
        (row.release_year ? results.find((r) => r.releaseYear === row.release_year) : undefined) ??
        results[0];
      tmdbId = match?.tmdbId ?? null;
    }
    if (!tmdbId) return "skipped";

    const d = await getMovieDetails(tmdbId);
    const patch: Record<string, unknown> = { tmdb_id: tmdbId };
    if (d.posterUrl) patch.poster_url = d.posterUrl;
    if (d.backdropUrl) patch.backdrop_url = d.backdropUrl;
    // Backfill only when empty — never clobber curated trailer/cast.
    if (!row.trailer_url && d.trailerUrl) patch.trailer_url = d.trailerUrl;
    const hasCast = Array.isArray(row.movie_cast) && row.movie_cast.length > 0;
    if (!hasCast && d.cast.length) patch.movie_cast = d.cast;

    if (!patch.poster_url && !patch.backdrop_url) return "skipped";
    const { error } = await admin.from("movies").update(patch).eq("id", row.id);
    return error ? "failed" : "updated";
  } catch {
    return "failed";
  }
}

/**
 * Bulk-fetch poster/backdrop art (and backfill tmdb_id/trailer/cast where empty)
 * for every movie. Movies without a tmdb_id are matched by title + year. Never
 * touches editorial fields. Runs the lookups in parallel batches to stay well
 * inside the server-action time budget.
 */
export async function refreshArtworkFromTmdb(): Promise<RefreshArtworkResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!tmdbConfigured()) return { error: "TMDB is not configured (set TMDB_ACCESS_TOKEN)." };

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("movies")
    .select("id, title, release_year, tmdb_id, trailer_url, movie_cast");
  if (error) return { error: "Could not load movies." };
  const rows = (data ?? []) as ArtworkRow[];

  const tally = { updated: 0, skipped: 0, failed: 0 };
  const BATCH = 8;
  for (let i = 0; i < rows.length; i += BATCH) {
    const results = await Promise.all(rows.slice(i, i + BATCH).map((r) => refreshOne(admin, r)));
    for (const r of results) tally[r]++;
  }

  revalidateMovies();
  revalidateCollections();
  return { ok: true, ...tally };
}

/* ------------------------------ Movie writes ------------------------------ */

/** Replace a movie's genre links with `genreIds`. */
async function setMovieGenres(
  admin: ReturnType<typeof supabaseAdmin>,
  movieId: string,
  genreIds: string[],
): Promise<void> {
  await admin.from("movie_genres").delete().eq("movie_id", movieId);
  const rows = [...new Set(genreIds)].map((genre_id) => ({ movie_id: movieId, genre_id }));
  if (rows.length) await admin.from("movie_genres").insert(rows);
}

/** Add a movie to the given collections (appended at each collection's tail). */
async function setMovieCollections(
  admin: ReturnType<typeof supabaseAdmin>,
  movieId: string,
  collectionIds: string[],
): Promise<void> {
  // Remove the movie from collections no longer selected, then add new ones.
  const wanted = new Set(collectionIds);
  const { data: current } = await admin
    .from("collection_movies")
    .select("collection_id")
    .eq("movie_id", movieId);
  const currentIds = new Set((current ?? []).map((r) => (r as { collection_id: string }).collection_id));

  const toRemove = [...currentIds].filter((id) => !wanted.has(id));
  if (toRemove.length) {
    await admin.from("collection_movies").delete().eq("movie_id", movieId).in("collection_id", toRemove);
  }
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));
  for (const collection_id of toAdd) {
    const { data: tail } = await admin
      .from("collection_movies")
      .select("sort_order")
      .eq("collection_id", collection_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    await admin
      .from("collection_movies")
      .insert({ collection_id, movie_id: movieId, sort_order: (tail?.sort_order ?? -1) + 1 });
  }
}

function reviewFields(input: ReviewInput | undefined, movieId: string) {
  const r = input ?? {};
  return {
    movie_id: movieId,
    rating: r.rating == null || !Number.isFinite(r.rating) ? null : Math.min(10, Math.max(0, r.rating)),
    verdict: clean(r.verdict, 300),
    recommendation_type: clean(r.recommendationType, 60),
    short_review: clean(r.shortReview, 600),
    full_review: clean(r.fullReview, 20000),
    why_recommend: clean(r.whyRecommend, 5000),
    best_for: clean(r.bestFor, 1000),
    watch_if: clean(r.watchIf, 1000),
    not_for: clean(r.notFor, 1000),
    spoiler_free: r.spoilerFree ?? true,
    published: r.published ?? false,
  };
}

function movieFields(input: MovieInput) {
  return {
    overview: clean(input.overview, 5000),
    tagline: clean(input.tagline, 300),
    poster_url: cleanUrl(input.posterUrl),
    backdrop_url: cleanUrl(input.backdropUrl),
    trailer_url: cleanUrl(input.trailerUrl),
    release_date: clean(input.releaseDate, 20),
    release_year: toInt(input.releaseYear, 1870, 2100),
    runtime: toInt(input.runtime, 0, 1000),
    original_language: clean(input.originalLanguage, 20),
    country: clean(input.country, 120),
    director: clean(input.director, 200),
    movie_cast: cleanCast(input.cast),
    moods: (input.moods ?? []).slice(0, 20).map((m) => String(m).slice(0, 40)),
    age_rating: clean(input.ageRating, 20),
    tmdb_id: toInt(input.tmdbId, 1, 2_000_000_000),
    external_source: clean(input.externalSource, 40) ?? "tmdb",
    is_published: input.isPublished ?? false,
  };
}

export async function createMovie(input: MovieInput): Promise<SaveMovieResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 200);
  if (!title) return { error: "Give the movie a title." };

  const admin = supabaseAdmin();
  const slug = await uniqueSlug(admin, "movies", title);

  const { data, error } = await admin
    .from("movies")
    .insert({ title, slug, ...movieFields(input) })
    .select("id, slug")
    .single();
  if (error || !data) return { error: `Could not save the movie: ${error?.message ?? "unknown error"}` };

  const movieId = (data as { id: string }).id;

  const { error: reviewErr } = await admin.from("reviews").insert(reviewFields(input.review, movieId));
  if (reviewErr) {
    // Roll back the movie so we never strand a movie with no editorial row.
    await admin.from("movies").delete().eq("id", movieId);
    return { error: `Could not save the review: ${reviewErr.message}` };
  }

  await setMovieGenres(admin, movieId, input.genreIds ?? []);
  await setMovieCollections(admin, movieId, input.collectionIds ?? []);

  revalidateMovies(slug);
  revalidateCollections();
  return { ok: true, id: movieId, slug };
}

export async function updateMovie(id: string, input: MovieInput): Promise<SaveMovieResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 200);
  if (!title) return { error: "Give the movie a title." };

  const admin = supabaseAdmin();
  // Slug is stable after creation — never break a live URL by re-slugging a title edit.
  const { data: existing } = await admin.from("movies").select("slug").eq("id", id).maybeSingle();
  if (!existing) return { error: "Movie not found." };
  const slug = (existing as { slug: string }).slug;

  const { error } = await admin
    .from("movies")
    .update({ title, ...movieFields(input) })
    .eq("id", id);
  if (error) return { error: `Could not save the movie: ${error.message}` };

  // Upsert the 1:1 review.
  const { error: reviewErr } = await admin
    .from("reviews")
    .upsert(reviewFields(input.review, id), { onConflict: "movie_id" });
  if (reviewErr) return { error: `Could not save the review: ${reviewErr.message}` };

  await setMovieGenres(admin, id, input.genreIds ?? []);
  await setMovieCollections(admin, id, input.collectionIds ?? []);

  revalidateMovies(slug);
  revalidateCollections();
  return { ok: true, id, slug };
}

export async function setMoviePublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("movies").update({ is_published: published }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidateMovies();
  revalidateCollections();
  return { ok: true };
}

export async function deleteMovie(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  // Cascades drop the review, genre links, and collection links.
  const { error } = await supabaseAdmin().from("movies").delete().eq("id", id);
  if (error) return { error: "Could not delete the movie." };
  revalidateMovies();
  revalidateCollections();
  return { ok: true };
}

/** Duplicate a movie as an unpublished draft (metadata + review copied). */
export async function duplicateMovie(id: string): Promise<SaveMovieResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const admin = supabaseAdmin();
  const { data: src } = await admin.from("movies").select("*").eq("id", id).maybeSingle();
  if (!src) return { error: "Movie not found." };
  const row = src as Record<string, unknown>;
  const title = `${row.title as string} (copy)`;
  const slug = await uniqueSlug(admin, "movies", title);

  const { id: _omitId, created_at: _c, updated_at: _u, ...rest } = row;
  void _omitId;
  void _c;
  void _u;
  const { data, error } = await admin
    .from("movies")
    .insert({ ...rest, title, slug, tmdb_id: null, is_published: false })
    .select("id, slug")
    .single();
  if (error || !data) return { error: "Could not duplicate the movie." };
  const newId = (data as { id: string }).id;

  const { data: srcReview } = await admin.from("reviews").select("*").eq("movie_id", id).maybeSingle();
  const reviewRow = srcReview as Record<string, unknown> | null;
  if (reviewRow) {
    const { id: _rid, movie_id: _mid, created_at: _rc, updated_at: _ru, ...reviewRest } = reviewRow;
    void _rid;
    void _mid;
    void _rc;
    void _ru;
    await admin.from("reviews").insert({ ...reviewRest, movie_id: newId, published: false });
  }

  const { data: genreLinks } = await admin.from("movie_genres").select("genre_id").eq("movie_id", id);
  await setMovieGenres(admin, newId, (genreLinks ?? []).map((g) => (g as { genre_id: string }).genre_id));

  revalidateMovies();
  return { ok: true, id: newId, slug };
}

/* ------------------------------ Collection writes ------------------------------ */

export async function createCollection(formData: FormData): Promise<SaveCollectionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(formData.get("title") as string, 200);
  if (!title) return { error: "Give the collection a title." };

  const admin = supabaseAdmin();
  const { data: tail } = await admin
    .from("collections")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("collections")
    .insert({
      title,
      slug: await uniqueSlug(admin, "collections", title),
      description: clean(formData.get("description") as string, 2000),
      cover_url: cleanUrl(formData.get("coverUrl") as string),
      is_published: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
      display_order: (tail?.display_order ?? -1) + 1,
    })
    .select("id, slug")
    .single();
  if (error || !data) return { error: `Could not create the collection: ${error?.message ?? "unknown"}` };

  revalidateCollections();
  return { ok: true, id: (data as { id: string }).id, slug: (data as { slug: string }).slug };
}

export async function updateCollection(id: string, formData: FormData): Promise<SaveCollectionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(formData.get("title") as string, 200);
  if (!title) return { error: "Give the collection a title." };

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("collections").select("slug").eq("id", id).maybeSingle();
  if (!existing) return { error: "Collection not found." };
  const slug = (existing as { slug: string }).slug;

  const { error } = await admin
    .from("collections")
    .update({
      title,
      description: clean(formData.get("description") as string, 2000),
      cover_url: cleanUrl(formData.get("coverUrl") as string),
      is_published: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
    })
    .eq("id", id);
  if (error) return { error: "Could not save the collection." };

  revalidateCollections(slug);
  return { ok: true, id, slug };
}

export async function setCollectionPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("collections").update({ is_published: published }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidateCollections();
  return { ok: true };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("collections").delete().eq("id", id);
  if (error) return { error: "Could not delete the collection." };
  revalidateCollections();
  return { ok: true };
}

/** Replace a collection's ordered membership with `movieIds` (in order). */
export async function setCollectionMovies(collectionId: string, movieIds: string[]): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(movieIds) || movieIds.length > 2000) return { error: "Invalid selection." };
  const admin = supabaseAdmin();
  await admin.from("collection_movies").delete().eq("collection_id", collectionId);
  const rows = [...new Set(movieIds)].map((movie_id, i) => ({
    collection_id: collectionId,
    movie_id,
    sort_order: i,
  }));
  if (rows.length) {
    const { error } = await admin.from("collection_movies").insert(rows);
    if (error) return { error: "Could not save the collection's movies." };
  }
  revalidateCollections();
  return { ok: true };
}

/* ------------------------------ My List (member) ------------------------------ */

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The viewer's My List state — fetched client-side so movie pages stay static. */
export async function getMyListState(): Promise<{ savedIds: string[]; loggedIn: boolean }> {
  const { supabase, user } = await requireUser();
  if (!user) return { savedIds: [], loggedIn: false };
  const { data } = await supabase.from("user_movie_list").select("movie_id").eq("user_id", user.id);
  return { savedIds: (data ?? []).map((r) => (r as { movie_id: string }).movie_id), loggedIn: true };
}

export async function toggleMyList(movieId: string): Promise<MyListResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sign in to save movies to your list." };
  if (typeof movieId !== "string" || !movieId) return { error: "Invalid movie." };

  const { data: existing } = await supabase
    .from("user_movie_list")
    .select("movie_id")
    .eq("user_id", user.id)
    .eq("movie_id", movieId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_movie_list")
      .delete()
      .eq("user_id", user.id)
      .eq("movie_id", movieId);
    if (error) return { error: "Could not update your list." };
    revalidatePath("/movies/my-list");
    return { ok: true, saved: false };
  }

  const { error } = await supabase.from("user_movie_list").insert({ user_id: user.id, movie_id: movieId });
  if (error) return { error: "Could not update your list." };
  revalidatePath("/movies/my-list");
  return { ok: true, saved: true };
}
