// URL discovery for the audit crawl. Pure: no I/O — the caller (job-server)
// fetches the homepage HTML and any sitemap XML, then hands them here.
//
// Strategy: union of sitemap <loc> entries and same-origin links found on the
// homepage → normalize + dedupe → classify → priority sort → cap to the budget,
// with the homepage always first. We deliberately do NOT crawl the whole site;
// a public lead-gen audit samples the important pages (spec §14).
import type { DiscoveredUrl, PageClass } from "./types";

const DEFAULT_BUDGET = 12;

// File extensions that are never HTML pages worth auditing.
const ASSET_EXT =
  /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|gz|mp4|webm|mp3|wav|woff2?|ttf|eot|rss|atom)$/i;

/** Extract every `<loc>` value from a sitemap or sitemap-index XML string. */
export function parseSitemap(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)) {
    const v = m[1].trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    if (v) out.push(decodeXmlEntities(v));
  }
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

/** True when a parsed sitemap `<loc>` points at another sitemap (index entry). */
export function isSitemapLoc(url: string): boolean {
  return /\.xml(?:\.gz)?(?:$|\?)/i.test(url) || /sitemap/i.test(url);
}

/** Absolute same-origin anchor hrefs on a page. Off-origin + asset links dropped. */
export function extractLinks(html: string, baseUrl: string): string[] {
  const base = safeUrl(baseUrl);
  if (!base) return [];
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const norm = normalizeUrl(m[1], base);
    if (norm) out.add(norm);
  }
  return [...out];
}

function safeUrl(raw: string, base?: URL): URL | null {
  try {
    return base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve `raw` against `base`, returning a canonical same-origin http(s) URL
 * with hash + query + trailing slash stripped, or null if off-origin / an asset
 * / not a page. Trailing slash is removed except on the root so `/x` and `/x/`
 * dedupe to one entry.
 */
export function normalizeUrl(raw: string, base: URL): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(trimmed)) return null;
  const u = safeUrl(trimmed, base);
  if (!u) return null;
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.hostname !== base.hostname) return null;
  if (ASSET_EXT.test(u.pathname)) return null;
  u.hash = "";
  u.search = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}

// Path-segment heuristics → page class. Checked in priority order; first hit wins.
const CLASS_RULES: { class: PageClass; re: RegExp }[] = [
  { class: "service", re: /\/(?:services?|solutions?|offerings?|what-we-do)(?:\/|$)/i },
  { class: "product", re: /\/(?:products?|shop|store|item|pricing|plans?)(?:\/|$)/i },
  { class: "location", re: /\/(?:locations?|areas?|cities|near-me|branch(?:es)?)(?:\/|$)/i },
  { class: "about", re: /\/(?:about|team|company|who-we-are|our-story)(?:\/|$)/i },
  { class: "contact", re: /\/(?:contact|book|appointment|get-a-quote|enquir)/i },
  { class: "author", re: /\/(?:author|profile|staff)s?(?:\/|$)/i },
  { class: "category", re: /\/(?:category|categories|collections?|topics?)(?:\/|$)/i },
  { class: "article", re: /\/(?:blog|news|articles?|guides?|resources?|insights?|posts?|learn)(?:\/|$)/i },
];

const PRIORITY: Record<PageClass, number> = {
  home: 0,
  service: 1,
  product: 1,
  category: 2,
  location: 2,
  about: 3,
  contact: 3,
  article: 4,
  author: 4,
  other: 5,
};

/** Classify a URL by its pathname. Root → home. */
export function classifyUrl(url: string): PageClass {
  const u = safeUrl(url);
  const path = u?.pathname ?? url;
  if (path === "/" || path === "") return "home";
  for (const rule of CLASS_RULES) if (rule.re.test(path)) return rule.class;
  return "other";
}

function depth(url: string): number {
  const u = safeUrl(url);
  return (u?.pathname ?? "/").split("/").filter(Boolean).length;
}

/**
 * Build the prioritized, budgeted crawl list from the homepage HTML and any
 * already-fetched sitemap `<loc>` values. The homepage is always included and
 * always first. Remaining slots go to the highest-priority classes, breaking
 * ties by shallower path depth then alphabetically for determinism.
 */
export function discoverUrls(input: {
  homeUrl: string;
  homeHtml: string;
  sitemapLocs?: string[];
  budget?: number;
}): DiscoveredUrl[] {
  const base = safeUrl(input.homeUrl);
  if (!base) return [];
  const budget = input.budget ?? DEFAULT_BUDGET;

  const home = normalizeUrl(input.homeUrl, base) ?? base.origin;

  const candidates = new Set<string>();
  for (const loc of input.sitemapLocs ?? []) {
    if (isSitemapLoc(loc)) continue; // skip nested-sitemap index entries
    const n = normalizeUrl(loc, base);
    if (n) candidates.add(n);
  }
  for (const link of extractLinks(input.homeHtml, input.homeUrl)) candidates.add(link);
  candidates.delete(home); // homepage is added explicitly, first

  const ranked = [...candidates]
    .map((url) => ({ url, class: classifyUrl(url), priority: PRIORITY[classifyUrl(url)] }))
    .sort((a, b) => a.priority - b.priority || depth(a.url) - depth(b.url) || a.url.localeCompare(b.url));

  const list: DiscoveredUrl[] = [{ url: home, class: "home", priority: 0 }, ...ranked];
  return list.slice(0, Math.max(1, budget));
}
