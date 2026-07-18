import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { parseHtml } from "@/lib/seo/parse-html";

// Swallow jsdom's noisy "Could not parse CSS stylesheet" warnings from real pages.
const silentConsole = new VirtualConsole();

/** Cleaned competitor-page signal for term stats and the competitor snapshot. */
export type Heading = { level: 1 | 2 | 3; text: string };

export type ExtractedPage = {
  title: string | null;
  metaDescription: string | null;
  headings: Heading[]; // ordered tree (h1-h3)
  bodyText: string; // boilerplate-stripped, tag-free
  wordCount: number;
  jsonldTypes: string[];
  junkRatio: number; // fraction of body lines that look like nav/boilerplate (QA metric)
  extractMethod: "readability" | "regex_fallback";
};

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g: string) => {
    if (g[0] === "#") {
      const code = g[1].toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[g.toLowerCase()] ?? m;
  });
}

// Drop clear site chrome. `<header>` is kept on purpose: competitor pages often
// wrap the H1 in an <article><header>, and dropping it would lose the title term.
function stripBoilerplate(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|aside|form)[\s\S]*?<\/\1>/gi, " ");
}

/** Prefer the first <article>, then <main>, then <body>, then the whole doc. */
function mainRegion(html: string): string {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (article) return article;
  const mainStart = html.search(/<main[^>]*>/i);
  if (mainStart !== -1) {
    const end = html.lastIndexOf("</main>");
    return html.slice(mainStart, end === -1 ? html.length : end);
  }
  return html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
}

function extractHeadings(region: string): Heading[] {
  const out: Heading[] = [];
  const re = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text) out.push({ level: Number(m[1]) as 1 | 2 | 3, text });
  }
  return out;
}

function toText(region: string): string {
  return decodeEntities(region.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// Lines that look like site chrome rather than article prose. Used only for a QA
// ratio (risk 2: catch a stripper leaving nav junk) — never to drop content.
const JUNK_LINE =
  /^(home|menu|search|subscribe|sign ?in|log ?in|register|share|tweet|follow|cookies?|privacy|terms|contact|about us|©|\d{4} all rights|back to top|skip to|read more|newsletter)\b/i;

function junkRatio(rawText: string): number {
  const lines = rawText.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (!lines.length) return 0;
  const junk = lines.filter((l) => l.length < 3 || JUNK_LINE.test(l)).length;
  return Math.round((junk / lines.length) * 1000) / 1000;
}

// Readability extraction: the article body with nav/footer/aside removed by the
// same engine Firefox Reader View uses. Headings come from the CLEANED article
// content, so nav headings don't leak in. Returns null on a framework shell with
// no real article, so the caller can fall back to the regex strip.
function readabilityExtract(html: string): { title: string | null; rawText: string; headings: Heading[] } | null {
  try {
    // Fresh JSDOM per call; Readability mutates the document it parses.
    const dom = new JSDOM(html, { url: "https://example.invalid/", virtualConsole: silentConsole });
    const article = new Readability(dom.window.document).parse();
    const rawText = article?.textContent?.trim() ?? "";
    if (!article || rawText.length < 200) return null; // no real article body
    return {
      title: article.title?.trim() || null,
      rawText,
      headings: extractHeadings(article.content ?? ""),
    };
  } catch {
    return null;
  }
}

/**
 * Extract the signal a competitor page contributes. Reuses parseHtml for the
 * head-based fields (title, meta, JSON-LD types). Body/headings come from
 * Readability; on a JS-shell page with no article, falls back to the regex strip.
 */
export function extractPage(html: string): ExtractedPage {
  const meta = parseHtml(html);
  const readable = readabilityExtract(html);

  if (readable) {
    const bodyText = readable.rawText.replace(/\s+/g, " ").trim();
    return {
      title: meta.title ?? readable.title,
      metaDescription: meta.description,
      jsonldTypes: meta.schemas,
      headings: readable.headings.length ? readable.headings : extractHeadings(mainRegion(html)),
      bodyText,
      wordCount: countWords(bodyText),
      junkRatio: junkRatio(readable.rawText),
      extractMethod: "readability",
    };
  }

  // Fallback: naive region + regex strip (framework shells, malformed HTML).
  const region = stripBoilerplate(mainRegion(html));
  const bodyText = toText(region);
  return {
    title: meta.title,
    metaDescription: meta.description,
    jsonldTypes: meta.schemas,
    headings: extractHeadings(region),
    bodyText,
    wordCount: countWords(bodyText),
    junkRatio: junkRatio(bodyText),
    extractMethod: "regex_fallback",
  };
}
