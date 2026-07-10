import { unstable_cache } from "next/cache";
import type { PageEntry, PageAnalysis } from "./types";
import { getRenderedHtml, SEO_AUDIT_TAG } from "./fetch-html";
import { parseHtml } from "./parse-html";

/**
 * Thrown when a route can't be fetched. `unstable_cache` only writes the cache
 * after its callback resolves (see `cacheNewResult` in Next's unstable-cache.js:
 * the write is `await`ed only on the success path). Throwing therefore keeps
 * unfetchable routes OUT of the cache — a transient failure is retried on the
 * next load instead of being pinned as "Could not fetch" for the whole hour.
 */
class UnfetchableRouteError extends Error {}

/**
 * Cache the parsed `PageAnalysis` (small JSON), not the raw HTML (hundreds of
 * KB per route × ~100 routes). Keyed on `origin` + `route`, which
 * `unstable_cache` folds into the cache key via the call arguments. Tagged with
 * `SEO_AUDIT_TAG` and given a 1h TTL, so the Re-run button's
 * `updateTag(SEO_AUDIT_TAG)` genuinely invalidates it. Survives the pages'
 * `export const dynamic = "force-dynamic"`: that sets `workStore.forceDynamic`,
 * not `workStore.fetchCache`, and `unstable_cache` only bypasses the cache when
 * `fetchCache === "force-no-store"`.
 */
const cachedAnalyze = unstable_cache(
  async (origin: string, route: string): Promise<PageAnalysis> => {
    const html = await getRenderedHtml(origin, route);
    if (html === null) throw new UnfetchableRouteError();
    return parseHtml(html);
  },
  ["seo-page-analysis"],
  { tags: [SEO_AUDIT_TAG], revalidate: 3600 },
);

/**
 * Analyses a route by fetching and parsing its rendered HTML, caching the
 * parsed result for an hour behind `SEO_AUDIT_TAG`.
 *
 * Returns `null` when the route could not be fetched — an unexpanded dynamic
 * template such as `/community/p/[id]` is not a real URL, and a dev server may
 * be down. Callers must not treat `null` as a zero score. Unfetchable routes
 * are not cached (see `UnfetchableRouteError`), so they retry next load.
 */
export async function analyzePage(
  entry: PageEntry,
  origin: string,
): Promise<PageAnalysis | null> {
  try {
    return await cachedAnalyze(origin, entry.route);
  } catch {
    return null;
  }
}
