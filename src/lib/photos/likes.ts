/**
 * Anonymous, client-only "likes" for the public photo gallery.
 *
 * Likes are stored in `localStorage` as a JSON array of photo ids under a single
 * key. No server, no auth, no cross-device sync — a like is a private gesture
 * that persists on this browser only (the task explicitly forbids server-side
 * persistence).
 *
 * Every function is SSR-safe: on the server (or any environment without
 * `window`/`localStorage`) reads return "empty" and writes are no-ops, so this
 * module can be imported from components that render on both sides.
 */

export const LIKES_KEY = "gallery-likes";

/** The backing store, or null when unavailable (SSR / privacy mode). */
function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Access to localStorage can throw (e.g. blocked third-party context).
    return null;
  }
}

/** Reads and parses the liked-id set, tolerating missing/corrupt data. */
function read(): Set<string> {
  const s = storage();
  if (!s) return new Set();
  try {
    const raw = s.getItem(LIKES_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

/** Persists the set, swallowing quota/serialization errors. */
function write(set: Set<string>): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(LIKES_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore: a failed write just means the like doesn't persist.
  }
}

/** All currently-liked photo ids. Empty set when unavailable. */
export function getLikedSet(): Set<string> {
  return read();
}

/** Whether a photo id is currently liked. */
export function isLiked(id: string): boolean {
  return read().has(id);
}

/**
 * Toggles a like and returns the NEW liked state (`true` = now liked).
 * When storage is unavailable the write is a no-op but the intended next state
 * is still returned, so an optimistic UI stays coherent for the session.
 */
export function toggleLike(id: string): boolean {
  const set = read();
  const nowLiked = !set.has(id);
  if (nowLiked) set.add(id);
  else set.delete(id);
  write(set);
  return nowLiked;
}
