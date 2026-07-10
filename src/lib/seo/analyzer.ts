import type { PageEntry, PageAnalysis } from "./types";
import { getRenderedHtml } from "./fetch-html";
import { parseHtml } from "./parse-html";

/**
 * Analyses a route by fetching and parsing its rendered HTML.
 *
 * Returns `null` when the route could not be fetched — an unexpanded dynamic
 * template such as `/community/p/[id]` is not a real URL, and a dev server may
 * be down. Callers must not treat `null` as a zero score.
 */
export async function analyzePage(
  entry: PageEntry,
  origin: string,
): Promise<PageAnalysis | null> {
  const html = await getRenderedHtml(origin, entry.route);
  return html === null ? null : parseHtml(html);
}
