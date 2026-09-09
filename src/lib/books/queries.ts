import "server-only";

import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOOK_COLLECTION_SELECT,
  BOOK_NOTE_SELECT,
  BOOK_PAGE_SELECT,
  GENRE_SELECT,
  mapBookRow,
  mapCollectionRow,
  mapGenreRow,
  mapNoteRow,
  mapPageRow,
  mapReadingRow,
  mapReviewRow,
  type BookRow,
  type BookCollection,
  type BookCollectionRow,
  type BookNote,
  type BookNoteRow,
  type BookPage,
  type BookPageRow,
  type BookReadingRow,
  type BookReviewRow,
  type BookWithRelations,
  type Genre,
  type GenreRow,
} from "./types";

// Book carries its 1:1 reading status + editorial review, plus genres. Alias
// names below (reading/review/genres) are load-bearing — the admin UI and a
// later task key off them.
const BOOK_WITH_RELATIONS = `
  *,
  reading:book_reading(*),
  review:book_reviews(*),
  genres:book_genres(genre:book_genres_ref(id,name,slug))
`;

type BookRelRow = BookRow & {
  // PostgREST returns a to-one embed as an array; book_reading.book_id /
  // book_reviews.book_id are UNIQUE (1:1) but still come back as arrays.
  reading?: BookReadingRow[] | null;
  review?: BookReviewRow[] | null;
  genres?: Array<{ genre: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null }> | null;
};

function mapBookWithRelations(row: BookRelRow): BookWithRelations {
  const book = mapBookRow(row);
  const reading = row.reading?.[0] ?? null;
  const review = row.review?.[0] ?? null;
  const genres = (row.genres ?? [])
    .map((g) => (Array.isArray(g.genre) ? g.genre[0] : g.genre))
    .filter((g): g is { id: string; name: string; slug: string } => g != null);
  return {
    ...book,
    reading: reading ? mapReadingRow(reading) : null,
    review: review ? mapReviewRow(review) : null,
    genres,
  };
}

// ===========================================================================
// PUBLIC READS (anon client, RLS-bound, fail soft to empty for prerender)
// ===========================================================================

export async function getPublishedBooks(limit = 200): Promise<BookWithRelations[]> {
  const { data, error } = await supabaseAnon()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[books] published list failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as BookRelRow[]).map(mapBookWithRelations);
}

export async function getBookBySlug(slug: string): Promise<BookWithRelations | null> {
  const { data, error } = await supabaseAnon()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[books] book-by-slug failed:", error.message);
    return null;
  }
  return data ? mapBookWithRelations(data as unknown as BookRelRow) : null;
}

export async function getPublishedBookSlugs(): Promise<string[]> {
  const { data, error } = await supabaseAnon().from("books").select("slug").eq("is_published", true);
  if (error) return [];
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

/** Published books tagged with the genre at `slug`. */
export async function getBooksByGenre(slug: string): Promise<BookWithRelations[]> {
  const { data: genre } = await supabaseAnon().from("book_genres_ref").select("id").eq("slug", slug).maybeSingle();
  if (!genre) return [];
  const { data: links } = await supabaseAnon()
    .from("book_genres")
    .select("book_id")
    .eq("genre_id", (genre as { id: string }).id);
  const ids = (links ?? []).map((l) => (l as { book_id: string }).book_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAnon()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .in("id", ids)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as unknown as BookRelRow[]).map(mapBookWithRelations);
}

/* ------------------------------ Auto feeds ------------------------------ */

const AUTO_FEEDS = ["currently_reading", "recently_finished", "recommended", "want_to_read", "favourites"] as const;
export type AutoFeed = (typeof AUTO_FEEDS)[number];

/**
 * ponytail: filters the published set in memory rather than a per-feed SQL
 * query (mirrors movies' getTopRated/getMustWatch) — fine at catalogue scale;
 * move to an indexed query if the shelf grows past a few hundred books.
 */
export async function getAutoFeed(feed: string): Promise<BookWithRelations[]> {
  if (!AUTO_FEEDS.includes(feed as AutoFeed)) return [];
  const all = await getPublishedBooks();
  switch (feed as AutoFeed) {
    case "currently_reading":
      return all.filter((b) => b.reading?.status === "currently_reading");
    case "recently_finished":
      return all
        .filter((b) => b.reading?.status === "finished")
        .sort((a, b) => (b.reading?.finishedAt ?? "").localeCompare(a.reading?.finishedAt ?? ""));
    case "recommended":
      return all.filter(
        (b) => b.review?.recommendationType === "Must Read" || b.review?.recommendationType === "Highly Recommended",
      );
    case "favourites":
      return all
        .filter((b) => (b.review?.rating ?? 0) >= 8)
        .sort((a, b) => (b.review?.rating ?? 0) - (a.review?.rating ?? 0));
    case "want_to_read":
      return all.filter((b) => b.reading?.status === "want_to_read");
    default:
      return [];
  }
}

/* ------------------------------ Collections ------------------------------ */
// ponytail: unlike movies' Collection, BookCollection (types.ts) carries no
// bookCount field, so no membership tally here — add if a later task needs it.

export async function getPublishedCollections(): Promise<BookCollection[]> {
  const { data, error } = await supabaseAnon()
    .from("book_collections")
    .select(BOOK_COLLECTION_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[books] collections failed:", error.message);
    return [];
  }
  return ((data ?? []) as BookCollectionRow[]).map(mapCollectionRow);
}

/** Published books in a collection, in the collection's saved order. */
async function getBooksInCollection(collectionId: string, client: SupabaseClient, filterPublished: boolean): Promise<BookWithRelations[]> {
  const { data: links, error } = await client
    .from("book_collection_items")
    .select("book_id, sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: true });
  if (error || !links || links.length === 0) return [];
  const orderedIds = (links as { book_id: string }[]).map((l) => l.book_id);
  let query = client.from("books").select(BOOK_WITH_RELATIONS).in("id", orderedIds);
  if (filterPublished) query = query.eq("is_published", true);
  const { data: books } = await query;
  const byId = new Map(((books ?? []) as unknown as BookRelRow[]).map((b) => [b.id, mapBookWithRelations(b)]));
  return orderedIds.map((id) => byId.get(id)).filter((b): b is BookWithRelations => b != null);
}

export async function getCollectionBySlug(
  slug: string,
): Promise<{ collection: BookCollection; books: BookWithRelations[] } | null> {
  const { data, error } = await supabaseAnon()
    .from("book_collections")
    .select(BOOK_COLLECTION_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  const collection = mapCollectionRow(data as BookCollectionRow);
  const books = await getBooksInCollection(collection.id, supabaseAnon(), true);
  return { collection, books };
}

/* ------------------------------ Notes ------------------------------ */

export async function getPublicNotes(bookId: string): Promise<BookNote[]> {
  const { data, error } = await supabaseAnon()
    .from("book_notes")
    .select(BOOK_NOTE_SELECT)
    .eq("book_id", bookId)
    .eq("published", true)
    .order("position", { ascending: true });
  if (error) return [];
  return ((data ?? []) as BookNoteRow[]).map(mapNoteRow);
}

/* ------------------------------ Homepage ------------------------------ */
// book_homepage_sections has no types.ts entry (out of Task 2's scope) — kept
// local to this file, same shape as lib/movies' HomepageSection.

const BOOK_HOMEPAGE_SECTION_SELECT =
  "id, title, kind, collection_id, book_id, auto_feed, is_enabled, display_order, created_at, updated_at";

type BookHomepageSectionRow = {
  id: string;
  title: string;
  kind: "hero" | "collection" | "auto";
  collection_id: string | null;
  book_id: string | null;
  auto_feed: string | null;
  is_enabled: boolean;
  display_order: number;
};

export type ResolvedBookHomepageSection = {
  id: string;
  title: string;
  kind: "hero" | "collection" | "auto";
  hero: BookWithRelations | null;
  collectionSlug: string | null;
  books: BookWithRelations[];
};

async function getPublishedBookById(id: string): Promise<BookWithRelations | null> {
  const { data } = await supabaseAnon()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return data ? mapBookWithRelations(data as unknown as BookRelRow) : null;
}

async function collectionSlugById(id: string): Promise<string | null> {
  const { data } = await supabaseAnon().from("book_collections").select("slug").eq("id", id).maybeSingle();
  return data ? (data as { slug: string }).slug : null;
}

/** Enabled homepage sections in order, each with its resolved content. */
export async function getHomepageSections(): Promise<ResolvedBookHomepageSection[]> {
  const { data, error } = await supabaseAnon()
    .from("book_homepage_sections")
    .select(BOOK_HOMEPAGE_SECTION_SELECT)
    .eq("is_enabled", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[books] homepage sections failed:", error.message);
    return [];
  }
  const sections = (data ?? []) as BookHomepageSectionRow[];
  return Promise.all(
    sections.map(async (s): Promise<ResolvedBookHomepageSection> => {
      if (s.kind === "hero") {
        const hero = s.book_id ? await getPublishedBookById(s.book_id) : null;
        return { id: s.id, title: s.title, kind: s.kind, hero, collectionSlug: null, books: [] };
      }
      if (s.kind === "collection" && s.collection_id) {
        const books = await getBooksInCollection(s.collection_id, supabaseAnon(), true);
        const slug = await collectionSlugById(s.collection_id);
        return { id: s.id, title: s.title, kind: s.kind, hero: null, collectionSlug: slug, books };
      }
      const books = await getAutoFeed(s.auto_feed ?? "");
      return { id: s.id, title: s.title, kind: s.kind, hero: null, collectionSlug: null, books };
    }),
  );
}

// ===========================================================================
// ADMIN READS (service role, bypasses RLS — includes drafts)
// ===========================================================================

export async function getAllBooksAdmin(): Promise<BookWithRelations[]> {
  const { data, error } = await supabaseAdmin()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as BookRelRow[]).map(mapBookWithRelations);
}

export async function getBookByIdAdmin(id: string): Promise<BookWithRelations | null> {
  const { data, error } = await supabaseAdmin()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBookWithRelations(data as unknown as BookRelRow) : null;
}

export async function getBookByGoogleIdAdmin(googleId: string): Promise<BookWithRelations | null> {
  const { data, error } = await supabaseAdmin()
    .from("books")
    .select(BOOK_WITH_RELATIONS)
    .eq("google_id", googleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBookWithRelations(data as unknown as BookRelRow) : null;
}

export async function getAllCollectionsAdmin(): Promise<BookCollection[]> {
  const { data, error } = await supabaseAdmin()
    .from("book_collections")
    .select(BOOK_COLLECTION_SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as BookCollectionRow[]).map(mapCollectionRow);
}

export async function getCollectionByIdAdmin(
  id: string,
): Promise<{ collection: BookCollection; books: BookWithRelations[] } | null> {
  const { data, error } = await supabaseAdmin().from("book_collections").select(BOOK_COLLECTION_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const collection = mapCollectionRow(data as BookCollectionRow);
  const books = await getBooksInCollection(id, supabaseAdmin(), false);
  return { collection, books };
}

export async function getAllBookGenresAdmin(): Promise<Genre[]> {
  const { data, error } = await supabaseAdmin().from("book_genres_ref").select(GENRE_SELECT).order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as GenreRow[]).map(mapGenreRow);
}

/** Genre ids a book belongs to — prefills the admin form. */
export async function getBookGenreIdsAdmin(bookId: string): Promise<string[]> {
  const { data } = await supabaseAdmin().from("book_genres").select("genre_id").eq("book_id", bookId);
  return (data ?? []).map((r) => (r as { genre_id: string }).genre_id);
}

/** Collection ids a book belongs to — prefills the admin form. */
export async function getBookCollectionIdsAdmin(bookId: string): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("book_collection_items")
    .select("collection_id")
    .eq("book_id", bookId);
  return (data ?? []).map((r) => (r as { collection_id: string }).collection_id);
}

/** All notes (incl. unpublished), ordered by position — admin editor. */
export async function getNotesAdmin(bookId: string): Promise<BookNote[]> {
  const { data, error } = await supabaseAdmin()
    .from("book_notes")
    .select(BOOK_NOTE_SELECT)
    .eq("book_id", bookId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as BookNoteRow[]).map(mapNoteRow);
}

/** All pages (incl. unpublished), ordered by position — admin editor. */
export async function getBookPagesAdmin(bookId: string): Promise<BookPage[]> {
  const { data, error } = await supabaseAdmin()
    .from("book_pages")
    .select(BOOK_PAGE_SELECT)
    .eq("book_id", bookId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as BookPageRow[]).map(mapPageRow);
}

export type BookPickerEntry = { id: string; title: string; author: string | null; coverUrl: string | null; year: number | null };

/** Lightweight book list for the shelf/collection editor picker. */
export async function getBooksForPickerAdmin(): Promise<BookPickerEntry[]> {
  const { data, error } = await supabaseAdmin()
    .from("books")
    .select("id, title, author, cover_url, publication_year")
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; title: string; author: string | null; cover_url: string | null; publication_year: number | null }[]).map(
    (r) => ({ id: r.id, title: r.title, author: r.author, coverUrl: r.cover_url, year: r.publication_year }),
  );
}
