import type { RenderedAnalysis } from "./types";

/**
 * Parses a route's rendered HTML into a `RenderedAnalysis`. Pure: no I/O.
 *
 * Regex over rendered markup, deliberately. `jsdom` is a devDependency
 * weighing ~10MB and would have to move into `dependencies` to run inside the
 * admin route. Rendered markup is stable enough that the fixtures in
 * parse-html.test.ts pin the contract; if this becomes a maintenance burden,
 * `linkedom` is a ~200KB drop-in.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

function decodeEntities(input: string): string {
  return input.replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ENTITIES[m] ?? m);
}

function headOf(html: string): string {
  return html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
}

function metaContent(head: string, attr: "name" | "property", key: string): string | null {
  const tag = head.match(new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*>`, "i"))?.[0];
  if (!tag) return null;
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return content === undefined ? null : decodeEntities(content);
}

/** Path portion of an og:image URL, tolerating a relative value. */
function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function ogImageSourceOf(head: string): RenderedAnalysis["ogImageSource"] {
  const ogImage = metaContent(head, "property", "og:image");
  if (!ogImage) return "none";
  return pathnameOf(ogImage).startsWith("/opengraph-image") ? "root-fallback" : "dedicated";
}

export function parseHtml(html: string): RenderedAnalysis {
  const head = headOf(html);

  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = rawTitle === undefined ? null : decodeEntities(rawTitle).trim();
  const description = metaContent(head, "name", "description");
  const robots = metaContent(head, "name", "robots") ?? "";

  return {
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    hasCanonical: /<link[^>]*rel=["']canonical["'][^>]*>/i.test(head),
    hasOgTags: /<meta[^>]*property=["']og:/i.test(head),
    hasTwitterCard: /<meta[^>]*name=["']twitter:card["']/i.test(head),
    robotsIndex: !/noindex/i.test(robots),
    robotsFollow: !/nofollow/i.test(robots),

    schemas: [],
    hasBreadcrumbs: false,
    schemaParseErrors: 0,

    ogImageSource: ogImageSourceOf(head),

    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    wordCount: 0,
    readingTime: 1,
    internalLinks: 0,
    externalLinks: 0,
    imageCount: 0,
    missingAltCount: 0,
    listCount: 0,
    mainRegionFound: false,
  };
}
