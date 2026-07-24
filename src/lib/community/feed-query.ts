import type { FeedSort, FeedWindow } from "./types";

/**
 * What a feed surface is showing — the whole identity of a stream, small enough
 * to hand to a client component and get back on every page request.
 *
 * It crosses the network from the browser, so nothing here may be trusted:
 * `sanitizeQuery` is what the server action runs before it reaches the RPC.
 */
export type FeedQuery = {
  sort?: FeedSort;
  window?: FeedWindow;
  author?: string;
  bookmarked?: boolean;
  liked?: boolean;
  reblogged?: boolean;
  /** Following tab — the feed filtered to people the viewer follows. */
  following?: boolean;
  /** Shuffle seed for `sort=hot`. Fixed per browsing session (it lives in the
   *  URL), which is what makes offset paging over a random order correct. */
  seed?: number;
};

const SORTS: readonly FeedSort[] = ["new", "hot", "top"];
const WINDOWS: readonly FeedWindow[] = ["all", "today", "week", "month", "year"];

/** Handles are lowercase alnum plus dot/underscore/dash — real ones contain dots. */
const HANDLE_RE = /^[a-z0-9._-]{1,64}$/;

/** Postgres `int` — the seed is concatenated into hashtext() as p_seed::text,
 *  so anything outside this range is an RPC-level overflow, not a bad sort. */
const MAX_SEED = 2_147_483_647;

/** Coerce an untrusted seed to a usable int. Non-numbers, NaN and out-of-range
 *  values become 0, which is a valid (if unshuffled-looking) seed rather than
 *  an error — a bad URL should still render a feed. */
export function clampSeed(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), MAX_SEED);
}

/** A fresh seed for a new `?sort=hot` visit. */
export function newSeed(): number {
  return Math.floor(Math.random() * MAX_SEED);
}

/**
 * Coerce an untrusted query into one the RPC can be handed.
 *
 * Unknown sort/window fall back to the defaults rather than erroring — a stale
 * client shouldn't 500 — and a malformed handle drops to undefined, which asks
 * for the unfiltered feed rather than smuggling a string into the RPC.
 *
 * The viewer-scoped filters are booleans only; the RPC resolves whose bookmarks
 * and likes those are from auth.uid(), so they can't be pointed at anyone else.
 */
export function sanitizeQuery(q: FeedQuery | null | undefined): Required<
  Pick<FeedQuery, "sort" | "window" | "bookmarked" | "liked" | "reblogged" | "seed" | "following">
> & { author?: string } {
  const author = typeof q?.author === "string" ? q.author.toLowerCase() : undefined;
  return {
    seed: clampSeed(q?.seed),
    sort: SORTS.includes(q?.sort as FeedSort) ? (q!.sort as FeedSort) : "new",
    window: WINDOWS.includes(q?.window as FeedWindow) ? (q!.window as FeedWindow) : "all",
    author: author && HANDLE_RE.test(author) ? author : undefined,
    bookmarked: q?.bookmarked === true,
    liked: q?.liked === true,
    reblogged: q?.reblogged === true,
    following: q?.following === true,
  };
}
