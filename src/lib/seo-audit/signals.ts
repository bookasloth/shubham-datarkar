// Per-page deterministic signal extraction for the audit engine. Pure: takes a
// page's HTML plus the fetch metadata the crawler observed (status, redirect
// hops, X-Robots-Tag header) and returns a flat PageSignals record the scorer
// consumes. Reuses parseHtml (head/schema/counts) and extractPage (Readability
// body + heading tree + junk ratio) rather than re-parsing HTML from scratch.
import { parseHtml } from "@/lib/seo/parse-html";
import { extractPage } from "@/lib/kalamai/extract";
import { extractLinks } from "./discover";
import type { PageClass } from "./types";

export type PageSignals = {
  url: string;
  class: PageClass;
  status: number;
  ok: boolean;
  redirectHops: number;
  https: boolean;

  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  canonical: string | null;
  canonicalSelf: boolean;
  robotsIndex: boolean; // meta robots AND X-Robots-Tag both allow indexing
  hasOgTitle: boolean;
  hasOgImage: boolean;
  hasTwitterCard: boolean;

  schemas: string[];
  schemaParseErrors: number;

  h1Count: number;
  h2Count: number;
  h3Count: number;
  skippedHeadingLevel: boolean; // h3 present without any h2
  wordCount: number;
  listCount: number;
  imageCount: number;
  imagesWithAlt: number;

  internalLinks: string[]; // normalized same-origin outbound links
  externalLinkCount: number;

  extractOk: boolean; // Readability found a real article body
  junkRatio: number;

  questionHeadings: number; // headings phrased as a question
  hasDates: boolean; // a published/updated date signal is present

  hasTelLink: boolean; // a tel: link (contact detail)
  hasMailtoLink: boolean; // a mailto: link (contact detail)
  mentionsTestimonials: boolean; // testimonial/review/case-study language or schema
  hasSameAs: boolean; // schema declares sameAs (entity disambiguation links)
  bodyFingerprint: string; // normalized head of body text, for duplicate detection
};

export type FetchMeta = {
  url: string;
  class: PageClass;
  html: string;
  status: number;
  ok: boolean;
  redirectHops: number;
  xRobotsTag?: string | null;
};

const QUESTION_RE = /^(?:how|what|why|when|where|who|which|can|do|does|is|are|should|will|would)\b|\?\s*$/i;

function canonicalHref(head: string): string | null {
  const tag = head.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
  if (!tag) return null;
  return tag.match(/href=["']([^"']+)["']/i)?.[1]?.trim() ?? null;
}

function headOf(html: string): string {
  return html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
}

/** Resolve two URLs to compare ignoring hash/query/trailing slash. */
function sameUrl(a: string, b: string): boolean {
  const norm = (u: string) => {
    try {
      const x = new URL(u);
      x.hash = "";
      x.search = "";
      if (x.pathname.length > 1) x.pathname = x.pathname.replace(/\/+$/, "");
      return x.toString();
    } catch {
      return u;
    }
  };
  return norm(a) === norm(b);
}

function hasDateSignal(html: string, schemas: string[], bodyHtmlSample: string): boolean {
  if (/"date(?:Published|Modified)"\s*:/i.test(html)) return true;
  if (schemas.includes("Article") || schemas.includes("BlogPosting")) return true;
  if (/<time\b[^>]*datetime=/i.test(html)) return true;
  return /\b(?:updated|published|last modified|posted)\b[^<]{0,20}\d{4}/i.test(bodyHtmlSample);
}

/** Extract every deterministic signal for one crawled page. */
export function extractSignals(meta: FetchMeta): PageSignals {
  const { html, url } = meta;
  const a = parseHtml(html); // head fields, schema types, main-region counts
  const ex = extractPage(html); // Readability body + heading tree + junk ratio
  const head = headOf(html);

  const canonical = canonicalHref(head);
  const absCanonical = canonical ? safeResolve(canonical, url) : null;

  const xNoindex = /noindex/i.test(meta.xRobotsTag ?? "");
  const robotsIndex = a.robotsIndex && !xNoindex;

  // Image alt coverage from the full document (parseHtml counts only the main region).
  const imgs = html.match(/<img\s[^>]*>/gi) ?? [];
  const imagesWithAlt = imgs.filter((t) => /\salt\s*=\s*["'][^"']*["']/i.test(t)).length;

  const questionHeadings = ex.headings.filter((h) => QUESTION_RE.test(h.text.trim())).length;

  return {
    url,
    class: meta.class,
    status: meta.status,
    ok: meta.ok,
    redirectHops: meta.redirectHops,
    https: (() => {
      try {
        return new URL(url).protocol === "https:";
      } catch {
        return false;
      }
    })(),

    title: a.title,
    titleLength: a.titleLength,
    description: a.description,
    descriptionLength: a.descriptionLength,
    canonical: absCanonical,
    canonicalSelf: absCanonical ? sameUrl(absCanonical, url) : false,
    robotsIndex,
    hasOgTitle: /<meta[^>]*property=["']og:title["']/i.test(head),
    hasOgImage: a.ogImageSource !== "none" || /<meta[^>]*property=["']og:image["']/i.test(head),
    hasTwitterCard: a.hasTwitterCard,

    schemas: a.schemas,
    schemaParseErrors: a.schemaParseErrors,

    h1Count: a.h1Count,
    h2Count: a.h2Count,
    h3Count: a.h3Count,
    skippedHeadingLevel: a.h3Count > 0 && a.h2Count === 0,
    wordCount: ex.wordCount || a.wordCount,
    listCount: a.listCount,
    imageCount: imgs.length,
    imagesWithAlt,

    internalLinks: extractLinks(html, url),
    externalLinkCount: a.externalLinks,

    extractOk: ex.extractMethod === "readability",
    junkRatio: ex.junkRatio,

    questionHeadings,
    hasDates: hasDateSignal(html, a.schemas, ex.bodyText.slice(0, 400)),

    hasTelLink: /href=["']tel:/i.test(html),
    hasMailtoLink: /href=["']mailto:/i.test(html),
    mentionsTestimonials:
      a.schemas.some((s) => ["Review", "AggregateRating"].includes(s)) ||
      /\b(?:testimonial|case stud|client review|customer review|what our clients say|success stor)/i.test(ex.bodyText),
    hasSameAs: /"sameAs"\s*:/i.test(html),
    bodyFingerprint: ex.bodyText.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 300),
  };
}

function safeResolve(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
