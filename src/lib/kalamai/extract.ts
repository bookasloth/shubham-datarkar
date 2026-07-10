import { parseHtml } from "@/lib/seo/parse-html";

/** Cleaned competitor-page signal for TF-IDF and the competitor snapshot. */
export type Heading = { level: 1 | 2 | 3; text: string };

export type ExtractedPage = {
  title: string | null;
  metaDescription: string | null;
  headings: Heading[]; // ordered tree (h1-h3)
  bodyText: string; // boilerplate-stripped, tag-free
  wordCount: number;
  jsonldTypes: string[];
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

/**
 * Extract the signal a competitor page contributes. Reuses parseHtml for the
 * head-based fields (title, meta, JSON-LD types) — those work on any page — and
 * does its own region/heading/body pass, since parseHtml only returns counts and
 * its word count is scoped to this site's own <main id="main">.
 */
export function extractPage(html: string): ExtractedPage {
  const meta = parseHtml(html);
  const region = stripBoilerplate(mainRegion(html));
  const bodyText = toText(region);
  return {
    title: meta.title,
    metaDescription: meta.description,
    jsonldTypes: meta.schemas,
    headings: extractHeadings(region),
    bodyText,
    wordCount: countWords(bodyText),
  };
}
