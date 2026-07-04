/**
 * Pure helpers for the public photo gallery browse experience.
 * No I/O, no React — safe to unit test in isolation and to import from
 * both server and client code.
 */

import type { Photo } from "@/lib/photos/types";

/**
 * Formats a photo's ISO `createdAt` into a short, human month-year label
 * (e.g. "July 2026"). Returns an empty string for missing/invalid input so
 * a bad date never crashes a card.
 */
export function formatPhotoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Whether more photos remain after the page just loaded, given how many have
 * been loaded so far and the size of the batch that just came back. A full
 * batch (length === limit) implies there may be more; a short (or empty) batch
 * means we've reached the end.
 *
 * `loadedCount` is the running total AFTER appending the batch; it's accepted
 * for callers that prefer to reason in totals, but the decision only depends on
 * the batch size vs. the requested limit.
 */
export function computeHasMore(loadedCount: number, batchSize: number, limit: number): boolean {
  if (limit <= 0) return false;
  if (loadedCount < 0 || batchSize < 0) return false;
  return batchSize >= limit;
}

/**
 * The offset to request for the next page, given how many photos are already
 * loaded. Trivial, but centralised so page-math lives in one tested place.
 */
export function nextOffset(loadedCount: number): number {
  return Math.max(0, loadedCount);
}

/**
 * Predicate: does a photo match the active tag? A null/empty active tag means
 * "All" and matches everything. Matching is exact against the photo's tags.
 */
export function matchesTag(photo: Pick<Photo, "tags">, activeTag: string | null): boolean {
  if (!activeTag) return true;
  return (photo.tags ?? []).includes(activeTag);
}

/**
 * Filters a list of photos by the active tag (see `matchesTag`).
 * Returns the same reference semantics as `Array.prototype.filter`.
 */
export function filterByTag<T extends Pick<Photo, "tags">>(photos: T[], activeTag: string | null): T[] {
  if (!activeTag) return photos;
  return photos.filter((p) => matchesTag(p, activeTag));
}
