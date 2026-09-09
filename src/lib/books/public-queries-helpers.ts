// Pure helpers for books public reads (similar-books ranking + search matching).
// No server-only import — safe to unit test without a Supabase client.

import type { BookWithRelations } from "./types";

/**
 * Rank `pool` by similarity to `target`: score = shared-genre-id count, +1 if
 * same author. Excludes `target.id`. Sorted desc, sliced to `limit`.
 */
export function rankSimilarBooks<T extends Pick<BookWithRelations, "id" | "author" | "genres">>(
  target: T,
  pool: T[],
  limit: number,
): T[] {
  const targetGenreIds = new Set((target.genres ?? []).map((g) => g.id));
  return pool
    .filter((b) => b.id !== target.id)
    .map((b) => {
      const overlap = (b.genres ?? []).filter((g) => targetGenreIds.has(g.id)).length;
      const authorBonus = target.author && b.author === target.author ? 1 : 0;
      return { book: b, score: overlap + authorBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.book);
}

/** Lowercased substring match over title, author, isbn, genre names, moods. */
export function matchBookQuery<
  T extends Pick<BookWithRelations, "title" | "author" | "isbn" | "genres" | "moods">,
>(book: T, q: string): boolean {
  const query = q.toLowerCase();
  if (book.title.toLowerCase().includes(query)) return true;
  if (book.author?.toLowerCase().includes(query)) return true;
  if (book.isbn?.toLowerCase().includes(query)) return true;
  if ((book.genres ?? []).some((g) => g.name.toLowerCase().includes(query))) return true;
  if ((book.moods ?? []).some((m) => m.toLowerCase().includes(query))) return true;
  return false;
}
