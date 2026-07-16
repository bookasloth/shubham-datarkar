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
};

const SORTS: readonly FeedSort[] = ["new", "hot", "top"];
const WINDOWS: readonly FeedWindow[] = ["all", "today", "week", "month", "year"];

/** Handles are lowercase alnum plus dot/underscore/dash — real ones contain dots. */
const HANDLE_RE = /^[a-z0-9._-]{1,64}$/;

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
  Pick<FeedQuery, "sort" | "window" | "bookmarked" | "liked" | "reblogged">
> & { author?: string } {
  const author = typeof q?.author === "string" ? q.author.toLowerCase() : undefined;
  return {
    sort: SORTS.includes(q?.sort as FeedSort) ? (q!.sort as FeedSort) : "new",
    window: WINDOWS.includes(q?.window as FeedWindow) ? (q!.window as FeedWindow) : "all",
    author: author && HANDLE_RE.test(author) ? author : undefined,
    bookmarked: q?.bookmarked === true,
    liked: q?.liked === true,
    reblogged: q?.reblogged === true,
  };
}
