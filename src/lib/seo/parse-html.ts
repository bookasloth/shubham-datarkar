import type { PageAnalysis } from "./types";

/**
 * Parses a route's rendered HTML into a `PageAnalysis`. Pure: no I/O.
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
  "&mdash;": "—",
  "&ndash;": "–",
};

function decodeEntities(input: string): string {
  return input.replace(/&(?:amp|lt|gt|quot|nbsp|mdash|ndash|#39|#x27);/g, (m) => ENTITIES[m] ?? m);
}

function headOf(html: string): string {
  return html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
}

function metaContent(head: string, attr: "name" | "property", key: string): string | null {
  const tag = head.match(new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*>`, "i"))?.[0];
  if (!tag) return null;
  const content = tag.match(/content=(["'])([\s\S]*?)\1/i)?.[2];
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

function ogImageSourceOf(head: string): PageAnalysis["ogImageSource"] {
  const ogImage = metaContent(head, "property", "og:image");
  if (!ogImage) return "none";
  return pathnameOf(ogImage).startsWith("/opengraph-image") ? "root-fallback" : "dedicated";
}

const LD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Top-level nodes only: the value itself, array members, or `@graph` members.
 * Nested entities (`author`, `provider`, `mainEntity`) describe a node rather
 * than the page, so descending into them would report types the page does not
 * actually declare.
 */
function topLevelNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(topLevelNodes);
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (node["@graph"]) return topLevelNodes(node["@graph"]);
    return [node];
  }
  return [];
}

function extractSchemas(html: string): { schemas: string[]; schemaParseErrors: number } {
  const types = new Set<string>();
  let schemaParseErrors = 0;

  for (const match of html.matchAll(LD_BLOCK)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      schemaParseErrors++;
      continue;
    }
    for (const node of topLevelNodes(parsed)) {
      const type = node["@type"];
      if (typeof type === "string") types.add(type);
      else if (Array.isArray(type)) {
        for (const t of type) if (typeof t === "string") types.add(t);
      }
    }
  }

  return { schemas: [...types], schemaParseErrors };
}

/**
 * The main region runs from `<main id="main">` to the LAST `</main>` in the
 * document. The games, community, and members layouts each render a nested
 * `<main>` inside the root layout's, so a lazy match would close the region at
 * the inner tag and silently drop most of the page.
 */
function mainRegion(html: string): { region: string; found: boolean } {
  const start = html.search(/<main[^>]*id=["']main["'][^>]*>/i);
  if (start === -1) {
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1];
    return { region: body ?? html, found: false };
  }
  const end = html.lastIndexOf("</main>");
  return { region: html.slice(start, end === -1 ? html.length : end), found: true };
}

function count(source: string, pattern: RegExp): number {
  return (source.match(pattern) || []).length;
}

function countWords(region: string): number {
  const text = decodeEntities(region.replace(/<[^>]+>/g, " "));
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function parseHtml(html: string): PageAnalysis {
  const head = headOf(html);

  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = rawTitle === undefined ? null : decodeEntities(rawTitle).trim();
  const description = metaContent(head, "name", "description");
  const robots = metaContent(head, "name", "robots") ?? "";
  const { schemas, schemaParseErrors } = extractSchemas(html);

  const { region, found } = mainRegion(html);
  const content = region.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  const images = content.match(/<img\s[^>]*>/gi) ?? [];
  const wordCount = countWords(content);

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

    schemas,
    hasBreadcrumbs: schemas.includes("BreadcrumbList"),
    schemaParseErrors,

    ogImageSource: ogImageSourceOf(head),

    h1Count: count(content, /<h1[\s>]/gi),
    h2Count: count(content, /<h2[\s>]/gi),
    h3Count: count(content, /<h3[\s>]/gi),
    wordCount,
    readingTime: Math.max(1, Math.round(wordCount / 200)),
    internalLinks: count(content, /<a[^>]+href=["']\/[^"']*["']/gi),
    externalLinks: count(content, /<a[^>]+href=["']https?:\/\//gi),
    imageCount: images.length,
    missingAltCount: images.filter((tag) => !/\salt\s*=/i.test(tag)).length,
    listCount: count(content, /<(?:ul|ol|table)[\s>]/gi),
    mainRegionFound: found,
  };
}
