"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { createClient, supabaseAdmin } from "@/lib/supabase/server";
import { slugify, computePercentage, READING_STATUSES } from "./types";
import { searchBooks, getBookDetails, type BookMetadata } from "./google-books";
import { getBookByGoogleIdAdmin } from "./queries";

/* ------------------------------ Result types ------------------------------ */

export type ActionResult = { ok: true } | { error: string };
export type SaveBookResult = { ok: true; id: string; slug: string } | { error: string };
export type SaveCollectionResult = { ok: true; id: string; slug: string } | { error: string };
export type SaveNoteResult = { ok: true; id: string } | { error: string };
export type SavePageResult = { ok: true; id: string } | { error: string };
export type SaveSectionResult = { ok: true; id: string } | { error: string };
export type GoogleSearchResult = { ok: true; results: BookMetadata[] } | { error: string };
export type GoogleImportResult =
  | { ok: true; id: string; slug: string; existing: boolean }
  | { error: string };
export type BookListResult = { ok: true; saved: boolean } | { error: string };
export type RefreshCoversResult =
  | { ok: true; updated: number; skipped: number; failed: number }
  | { error: string };

/* ------------------------------ Input shapes ------------------------------ */

export type ReviewInput = {
  rating?: number | null;
  verdict?: string;
  recommendationType?: string;
  shortReview?: string;
  fullReview?: string;
  whyRead?: string;
  whyRecommend?: string;
  whatILearned?: string;
  whoShouldRead?: string;
  whoShouldNotRead?: string;
  published?: boolean;
};

export type ReadingInput = {
  status?: string;
  currentPage?: number | null;
  totalPages?: number | null;
  startedAt?: string | null;
  lastReadAt?: string | null;
  finishedAt?: string | null;
};

export type BookInput = {
  title: string;
  subtitle?: string;
  description?: string;
  author?: string;
  authors?: string[];
  coverUrl?: string;
  backdropUrl?: string;
  isbn?: string;
  publisher?: string;
  publicationDate?: string | null;
  publicationYear?: number | null;
  pageCount?: number | null;
  language?: string;
  country?: string;
  moods?: string[];
  googleId?: string;
  externalSource?: string;
  isPublished?: boolean;
  genreIds?: string[];
  collectionIds?: string[];
  review?: ReviewInput;
  reading?: ReadingInput;
};

export type NoteInput = {
  id?: string;
  bookId: string;
  chapter?: string;
  page?: number | null;
  quote?: string;
  note?: string;
  tags?: string[];
  published?: boolean;
};

export type PageInput = {
  id?: string;
  bookId: string;
  pageType: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  published?: boolean;
};

export type HomepageSectionInput = {
  id?: string;
  title: string;
  kind: "hero" | "collection" | "auto";
  collectionId?: string | null;
  bookId?: string | null;
  autoFeed?: string | null;
  isEnabled?: boolean;
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

/** Normalize + cap a string array (author names, tags, ...). */
function cleanStringArray(arr: string[] | undefined, max: number, itemMax: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, max)
    .map((s) => String(s ?? "").trim().slice(0, itemMax))
    .filter(Boolean);
}

function revalidateBooks(slug?: string, collectionSlug?: string): void {
  revalidatePath("/books");
  revalidatePath("/books/my-list");
  revalidatePath("/admin/books");
  revalidatePath("/admin/collections");
  if (slug) revalidatePath(`/books/${slug}`);
  if (collectionSlug) revalidatePath(`/collections/${collectionSlug}`);
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

/* ------------------------------ Field mappers ------------------------------ */

function bookFields(input: BookInput) {
  return {
    subtitle: clean(input.subtitle, 300),
    description: clean(input.description, 5000),
    author: clean(input.author, 200),
    authors: cleanStringArray(input.authors, 20, 200),
    cover_url: cleanUrl(input.coverUrl),
    backdrop_url: cleanUrl(input.backdropUrl),
    isbn: clean(input.isbn, 50),
    publisher: clean(input.publisher, 200),
    publication_date: clean(input.publicationDate, 20),
    publication_year: toInt(input.publicationYear, 1000, 3000),
    page_count: toInt(input.pageCount, 0, 100_000),
    language: clean(input.language, 20),
    country: clean(input.country, 120),
    moods: cleanStringArray(input.moods, 20, 40),
    google_id: clean(input.googleId, 100),
    external_source: clean(input.externalSource, 40) ?? "google_books",
    is_published: input.isPublished ?? false,
  };
}

function reviewFields(input: ReviewInput | undefined, bookId: string) {
  const r = input ?? {};
  return {
    book_id: bookId,
    rating: r.rating == null || !Number.isFinite(r.rating) ? null : Math.min(10, Math.max(0, r.rating)),
    verdict: clean(r.verdict, 300),
    recommendation_type: clean(r.recommendationType, 60),
    short_review: clean(r.shortReview, 600),
    full_review: clean(r.fullReview, 20000),
    why_read: clean(r.whyRead, 5000),
    why_recommend: clean(r.whyRecommend, 5000),
    what_i_learned: clean(r.whatILearned, 5000),
    who_should_read: clean(r.whoShouldRead, 1000),
    who_should_not_read: clean(r.whoShouldNotRead, 1000),
    published: r.published ?? false,
  };
}

function readingFields(input: ReadingInput | undefined, bookId: string) {
  const r = input ?? {};
  const status = READING_STATUSES.includes(r.status as (typeof READING_STATUSES)[number])
    ? (r.status as string)
    : "want_to_read";
  const currentPage = toInt(r.currentPage, 0, 1_000_000);
  const totalPages = toInt(r.totalPages, 0, 1_000_000);
  let finishedAt = clean(r.finishedAt, 20);
  if (status === "finished" && !finishedAt) {
    finishedAt = new Date().toISOString().slice(0, 10);
  }
  return {
    book_id: bookId,
    status,
    current_page: currentPage,
    total_pages: totalPages,
    percentage: computePercentage(currentPage, totalPages, status),
    started_at: clean(r.startedAt, 20),
    last_read_at: clean(r.lastReadAt, 20),
    finished_at: finishedAt,
  };
}

/* ------------------------------ Relation diffs ------------------------------ */

/** Replace a book's genre links with `genreIds`. */
async function setBookGenres(
  admin: ReturnType<typeof supabaseAdmin>,
  bookId: string,
  genreIds: string[],
): Promise<void> {
  await admin.from("book_genres").delete().eq("book_id", bookId);
  const rows = [...new Set(genreIds)].map((genre_id) => ({ book_id: bookId, genre_id }));
  if (rows.length) await admin.from("book_genres").insert(rows);
}

/** Add a book to the given collections (appended at each collection's tail). */
export async function setBookCollections(bookId: string, collectionIds: string[]): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const admin = supabaseAdmin();
  await setBookCollectionsInternal(admin, bookId, collectionIds);
  revalidateBooks();
  return { ok: true };
}

async function setBookCollectionsInternal(
  admin: ReturnType<typeof supabaseAdmin>,
  bookId: string,
  collectionIds: string[],
): Promise<void> {
  const wanted = new Set(collectionIds);
  const { data: current } = await admin
    .from("book_collection_items")
    .select("collection_id")
    .eq("book_id", bookId);
  const currentIds = new Set(
    (current ?? []).map((r) => (r as { collection_id: string }).collection_id),
  );

  const toRemove = [...currentIds].filter((id) => !wanted.has(id));
  if (toRemove.length) {
    await admin.from("book_collection_items").delete().eq("book_id", bookId).in("collection_id", toRemove);
  }
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));
  for (const collection_id of toAdd) {
    const { data: tail } = await admin
      .from("book_collection_items")
      .select("sort_order")
      .eq("collection_id", collection_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    await admin
      .from("book_collection_items")
      .insert({ collection_id, book_id: bookId, sort_order: (tail?.sort_order ?? -1) + 1 });
  }
}

/** Replace a collection's ordered book membership with `bookIds` (in order). */
export async function setCollectionBooks(collectionId: string, bookIds: string[]): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(bookIds) || bookIds.length > 2000) return { error: "Invalid selection." };
  const admin = supabaseAdmin();
  await admin.from("book_collection_items").delete().eq("collection_id", collectionId);
  const rows = [...new Set(bookIds)].map((book_id, i) => ({
    collection_id: collectionId,
    book_id,
    sort_order: i,
  }));
  if (rows.length) {
    const { error } = await admin.from("book_collection_items").insert(rows);
    if (error) return { error: "Could not save the collection's books." };
  }
  revalidateBooks();
  return { ok: true };
}

/* ------------------------------ Book writes ------------------------------ */

export async function createBook(input: BookInput): Promise<SaveBookResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 300);
  if (!title) return { error: "Give the book a title." };

  const admin = supabaseAdmin();
  const slug = await uniqueSlug(admin, "books", title);

  const { data, error } = await admin
    .from("books")
    .insert({ title, slug, ...bookFields(input) })
    .select("id, slug")
    .single();
  if (error || !data) return { error: `Could not save the book: ${error?.message ?? "unknown error"}` };

  const bookId = (data as { id: string }).id;

  const { error: readingErr } = await admin
    .from("book_reading")
    .upsert(readingFields(input.reading, bookId), { onConflict: "book_id" });
  const { error: reviewErr } = readingErr
    ? { error: null }
    : await admin.from("book_reviews").upsert(reviewFields(input.review, bookId), { onConflict: "book_id" });

  if (readingErr || reviewErr) {
    // Roll back the book so we never strand one with no reading/review row.
    await admin.from("books").delete().eq("id", bookId);
    return { error: `Could not save the book: ${(readingErr ?? reviewErr)?.message}` };
  }

  await setBookGenres(admin, bookId, input.genreIds ?? []);
  await setBookCollectionsInternal(admin, bookId, input.collectionIds ?? []);

  revalidateBooks(slug);
  return { ok: true, id: bookId, slug };
}

export async function updateBook(id: string, input: BookInput): Promise<SaveBookResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 300);
  if (!title) return { error: "Give the book a title." };

  const admin = supabaseAdmin();
  // Slug is stable after creation — never break a live URL by re-slugging a title edit.
  const { data: existing } = await admin.from("books").select("slug").eq("id", id).maybeSingle();
  if (!existing) return { error: "Book not found." };
  const slug = (existing as { slug: string }).slug;

  const { error } = await admin
    .from("books")
    .update({ title, ...bookFields(input) })
    .eq("id", id);
  if (error) return { error: `Could not save the book: ${error.message}` };

  const { error: readingErr } = await admin
    .from("book_reading")
    .upsert(readingFields(input.reading, id), { onConflict: "book_id" });
  if (readingErr) return { error: `Could not save the reading status: ${readingErr.message}` };

  const { error: reviewErr } = await admin
    .from("book_reviews")
    .upsert(reviewFields(input.review, id), { onConflict: "book_id" });
  if (reviewErr) return { error: `Could not save the review: ${reviewErr.message}` };

  await setBookGenres(admin, id, input.genreIds ?? []);
  await setBookCollectionsInternal(admin, id, input.collectionIds ?? []);

  revalidateBooks(slug);
  return { ok: true, id, slug };
}

export async function setBookPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("books").update({ is_published: published }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidateBooks();
  return { ok: true };
}

export async function deleteBook(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  // Cascades drop the reading/review rows, genre links, collection links, notes and pages.
  const { error } = await supabaseAdmin().from("books").delete().eq("id", id);
  if (error) return { error: "Could not delete the book." };
  revalidateBooks();
  return { ok: true };
}

/** Duplicate a book as an unpublished draft (metadata + review copied; reading reset). */
export async function duplicateBook(id: string): Promise<SaveBookResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const admin = supabaseAdmin();
  const { data: src } = await admin.from("books").select("*").eq("id", id).maybeSingle();
  if (!src) return { error: "Book not found." };
  const row = src as Record<string, unknown>;
  const title = `${row.title as string} (copy)`;
  const slug = await uniqueSlug(admin, "books", title);

  const { id: _omitId, created_at: _c, updated_at: _u, ...rest } = row;
  void _omitId;
  void _c;
  void _u;
  const { data, error } = await admin
    .from("books")
    .insert({ ...rest, title, slug, google_id: null, is_published: false })
    .select("id, slug")
    .single();
  if (error || !data) return { error: "Could not duplicate the book." };
  const newId = (data as { id: string }).id;

  const { data: srcReview } = await admin.from("book_reviews").select("*").eq("book_id", id).maybeSingle();
  const reviewRow = srcReview as Record<string, unknown> | null;
  if (reviewRow) {
    const { id: _rid, book_id: _bid, created_at: _rc, updated_at: _ru, ...reviewRest } = reviewRow;
    void _rid;
    void _bid;
    void _rc;
    void _ru;
    await admin.from("book_reviews").insert({ ...reviewRest, book_id: newId, published: false });
  }
  // Reset reading progress on the copy — a duplicate is a fresh draft, not a re-read.
  await admin.from("book_reading").insert({ book_id: newId, status: "want_to_read" });

  const { data: genreLinks } = await admin.from("book_genres").select("genre_id").eq("book_id", id);
  await setBookGenres(admin, newId, (genreLinks ?? []).map((g) => (g as { genre_id: string }).genre_id));

  revalidateBooks();
  return { ok: true, id: newId, slug };
}

/* ------------------------------ Collection writes ------------------------------ */

export async function createCollection(formData: FormData): Promise<SaveCollectionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(formData.get("title") as string, 200);
  if (!title) return { error: "Give the collection a title." };

  const admin = supabaseAdmin();
  const { data: tail } = await admin
    .from("book_collections")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("book_collections")
    .insert({
      title,
      slug: await uniqueSlug(admin, "book_collections", title),
      description: clean(formData.get("description") as string, 2000),
      cover_url: cleanUrl(formData.get("coverUrl") as string),
      is_published: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
      display_order: (tail?.display_order ?? -1) + 1,
    })
    .select("id, slug")
    .single();
  if (error || !data) return { error: `Could not create the collection: ${error?.message ?? "unknown"}` };

  revalidateBooks();
  return { ok: true, id: (data as { id: string }).id, slug: (data as { slug: string }).slug };
}

export async function updateCollection(id: string, formData: FormData): Promise<SaveCollectionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(formData.get("title") as string, 200);
  if (!title) return { error: "Give the collection a title." };

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("book_collections").select("slug").eq("id", id).maybeSingle();
  if (!existing) return { error: "Collection not found." };
  const slug = (existing as { slug: string }).slug;

  const { error } = await admin
    .from("book_collections")
    .update({
      title,
      description: clean(formData.get("description") as string, 2000),
      cover_url: cleanUrl(formData.get("coverUrl") as string),
      is_published: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
    })
    .eq("id", id);
  if (error) return { error: "Could not save the collection." };

  revalidateBooks(undefined, slug);
  return { ok: true, id, slug };
}

export async function setCollectionPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("book_collections").update({ is_published: published }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidateBooks();
  return { ok: true };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("book_collections").delete().eq("id", id);
  if (error) return { error: "Could not delete the collection." };
  revalidateBooks();
  return { ok: true };
}

/* ------------------------------ Notes ------------------------------ */

export async function saveNote(input: NoteInput): Promise<SaveNoteResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!input.bookId) return { error: "Missing book." };
  const admin = supabaseAdmin();
  const fields = {
    book_id: input.bookId,
    chapter: clean(input.chapter, 200),
    page: toInt(input.page, 0, 1_000_000),
    quote: clean(input.quote, 5000),
    note: clean(input.note, 5000),
    tags: cleanStringArray(input.tags, 20, 60),
    published: input.published ?? false,
  };

  if (input.id) {
    const { error } = await admin.from("book_notes").update(fields).eq("id", input.id);
    if (error) return { error: "Could not save the note." };
    revalidateBooks();
    return { ok: true, id: input.id };
  }

  const { data: tail } = await admin
    .from("book_notes")
    .select("position")
    .eq("book_id", input.bookId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await admin
    .from("book_notes")
    .insert({ ...fields, position: (tail?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save the note." };
  revalidateBooks();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("book_notes").delete().eq("id", id);
  if (error) return { error: "Could not delete the note." };
  revalidateBooks();
  return { ok: true };
}

/* ------------------------------ Pages (open-book builder) ------------------------------ */

const PAGE_TYPES = [
  "cover",
  "text",
  "review",
  "notes",
  "lessons",
  "quote",
  "image",
  "book_info",
  "recommendations",
];

export async function saveBookPage(input: PageInput): Promise<SavePageResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!input.bookId) return { error: "Missing book." };
  if (!PAGE_TYPES.includes(input.pageType)) return { error: "Invalid page type." };
  const admin = supabaseAdmin();
  const fields = {
    book_id: input.bookId,
    page_type: input.pageType,
    title: clean(input.title, 200),
    content: clean(input.content, 50000),
    metadata: input.metadata ?? {},
    published: input.published ?? true,
  };

  if (input.id) {
    const { error } = await admin.from("book_pages").update(fields).eq("id", input.id);
    if (error) return { error: "Could not save the page." };
    revalidateBooks();
    return { ok: true, id: input.id };
  }

  const { data: tail } = await admin
    .from("book_pages")
    .select("position")
    .eq("book_id", input.bookId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await admin
    .from("book_pages")
    .insert({ ...fields, position: (tail?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save the page." };
  revalidateBooks();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteBookPage(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("book_pages").delete().eq("id", id);
  if (error) return { error: "Could not delete the page." };
  revalidateBooks();
  return { ok: true };
}

/** Persist a new page order for one book. */
export async function reorderBookPages(bookId: string, orderedIds: string[]): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(orderedIds) || orderedIds.length > 500) return { error: "Invalid order." };
  const admin = supabaseAdmin();
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      admin.from("book_pages").update({ position }).eq("id", id).eq("book_id", bookId),
    ),
  );
  if (results.some((r) => r.error)) return { error: "Could not save the page order." };
  revalidateBooks();
  return { ok: true };
}

/* ------------------------------ Homepage sections ------------------------------ */

export async function saveHomepageSection(input: HomepageSectionInput): Promise<SaveSectionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 200);
  if (!title) return { error: "Give the section a title." };
  if (!["hero", "collection", "auto"].includes(input.kind)) return { error: "Invalid section kind." };

  const admin = supabaseAdmin();
  const fields = {
    title,
    kind: input.kind,
    collection_id: input.kind === "collection" ? input.collectionId ?? null : null,
    book_id: input.kind === "hero" ? input.bookId ?? null : null,
    auto_feed: input.kind === "auto" ? input.autoFeed ?? null : null,
    is_enabled: input.isEnabled ?? true,
  };

  if (input.id) {
    const { error } = await admin.from("book_homepage_sections").update(fields).eq("id", input.id);
    if (error) return { error: "Could not save the section." };
    revalidateBooks();
    return { ok: true, id: input.id };
  }

  const { data: tail } = await admin
    .from("book_homepage_sections")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await admin
    .from("book_homepage_sections")
    .insert({ ...fields, display_order: (tail?.display_order ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save the section." };
  revalidateBooks();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteHomepageSection(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("book_homepage_sections").delete().eq("id", id);
  if (error) return { error: "Could not delete the section." };
  revalidateBooks();
  return { ok: true };
}

export async function reorderHomepageSections(orderedIds: string[]): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(orderedIds) || orderedIds.length > 500) return { error: "Invalid order." };
  const admin = supabaseAdmin();
  const results = await Promise.all(
    orderedIds.map((id, display_order) =>
      admin.from("book_homepage_sections").update({ display_order }).eq("id", id),
    ),
  );
  if (results.some((r) => r.error)) return { error: "Could not save the section order." };
  revalidateBooks();
  return { ok: true };
}

/* ------------------------------ Google Books import ------------------------------ */

export async function searchGoogleBooks(query: string): Promise<GoogleSearchResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  try {
    const results = await searchBooks(query);
    return { ok: true, results };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Google Books search failed." };
  }
}

/** Create a book from Google Books metadata, or return the existing import. */
export async function importFromGoogleBooks(googleId: string): Promise<GoogleImportResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!googleId) return { error: "Invalid book id." };

  const existing = await getBookByGoogleIdAdmin(googleId);
  if (existing) return { ok: true, id: existing.id, slug: existing.slug, existing: true };

  try {
    const meta = await getBookDetails(googleId);
    if (!meta || !meta.title) return { error: "Could not find that book on Google Books." };

    const admin = supabaseAdmin();
    const title = clean(meta.title, 300) ?? "Untitled";
    const slug = await uniqueSlug(admin, "books", title);
    const { data, error } = await admin
      .from("books")
      .insert({
        title,
        slug,
        subtitle: clean(meta.subtitle, 300),
        description: clean(meta.description, 5000),
        authors: cleanStringArray(meta.authors, 20, 200),
        author: meta.authors[0] ? clean(meta.authors[0], 200) : null,
        cover_url: cleanUrl(meta.cover),
        isbn: clean(meta.isbn, 50),
        publisher: clean(meta.publisher, 200),
        publication_date: clean(meta.publishedDate, 20),
        publication_year: meta.publishedDate ? toInt(parseInt(meta.publishedDate.slice(0, 4), 10), 1000, 3000) : null,
        page_count: toInt(meta.pageCount, 0, 100_000),
        language: clean(meta.language, 20),
        google_id: meta.googleId,
        external_source: "google_books",
        is_published: false,
      })
      .select("id, slug")
      .single();
    if (error || !data) return { error: `Could not import the book: ${error?.message ?? "unknown error"}` };

    revalidateBooks();
    return { ok: true, id: (data as { id: string }).id, slug: (data as { slug: string }).slug, existing: false };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Google Books import failed." };
  }
}

type CoverRow = { id: string; title: string; google_id: string | null; cover_url: string | null; isbn: string | null };

/** Resolve one book's cover from Google Books → "updated" | "skipped" | "failed". */
async function refreshOneCover(
  admin: ReturnType<typeof supabaseAdmin>,
  row: CoverRow,
): Promise<"updated" | "skipped" | "failed"> {
  try {
    let meta: BookMetadata | null = null;
    if (row.google_id) {
      meta = await getBookDetails(row.google_id);
    } else {
      const results = await searchBooks(row.title);
      meta = results[0] ?? null;
    }
    if (!meta) return "skipped";

    const patch: Record<string, unknown> = {};
    if (!row.google_id && meta.googleId) patch.google_id = meta.googleId;
    if (!row.cover_url && meta.cover) patch.cover_url = meta.cover;
    if (!row.isbn && meta.isbn) patch.isbn = meta.isbn;
    // ponytail: Google Books has no backdrop-image field, so backdrop_url is
    // never backfilled here — add a source (e.g. a wider cover crop) if needed.

    if (Object.keys(patch).length === 0) return "skipped";
    const { error } = await admin.from("books").update(patch).eq("id", row.id);
    return error ? "failed" : "updated";
  } catch {
    return "failed";
  }
}

/**
 * Bulk-fetch covers (and backfill google_id/isbn where empty) for every book.
 * Never touches editorial fields. Runs in parallel batches of 8.
 */
export async function refreshCoversFromGoogleBooks(): Promise<RefreshCoversResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("books").select("id, title, google_id, cover_url, isbn");
  if (error) return { error: "Could not load books." };
  const rows = (data ?? []) as CoverRow[];

  const tally = { updated: 0, skipped: 0, failed: 0 };
  const BATCH = 8;
  for (let i = 0; i < rows.length; i += BATCH) {
    const results = await Promise.all(rows.slice(i, i + BATCH).map((r) => refreshOneCover(admin, r)));
    for (const r of results) tally[r]++;
  }

  revalidateBooks();
  return { ok: true, ...tally };
}

/* ------------------------------ Visitor list (member) ------------------------------ */

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The viewer's book-list state — fetched client-side so book pages stay static. */
export async function getBookListState(): Promise<{ items: Record<string, string>; loggedIn: boolean }> {
  const { supabase, user } = await requireUser();
  if (!user) return { items: {}, loggedIn: false };
  const { data } = await supabase.from("user_book_list").select("book_id, status").eq("user_id", user.id);
  const items: Record<string, string> = {};
  for (const r of (data ?? []) as { book_id: string; status: string }[]) items[r.book_id] = r.status;
  return { items, loggedIn: true };
}

/** Set (or clear, if already set to the same status) the viewer's status for a book. */
export async function toggleBookList(bookId: string, status: string): Promise<BookListResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sign in to save books to your list." };
  if (typeof bookId !== "string" || !bookId) return { error: "Invalid book." };
  if (!["want_to_read", "currently_reading", "finished"].includes(status)) return { error: "Invalid status." };

  const { data: existing } = await supabase
    .from("user_book_list")
    .select("status")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing && (existing as { status: string }).status === status) {
    const { error } = await supabase
      .from("user_book_list")
      .delete()
      .eq("user_id", user.id)
      .eq("book_id", bookId);
    if (error) return { error: "Could not update your list." };
    revalidatePath("/books/my-list");
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("user_book_list")
    .upsert({ user_id: user.id, book_id: bookId, status }, { onConflict: "user_id,book_id" });
  if (error) return { error: "Could not update your list." };
  revalidatePath("/books/my-list");
  return { ok: true, saved: true };
}
