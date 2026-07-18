import type { ContentBlock } from "@/lib/data/types";

/**
 * Thrown when the model output can't be read as a ContentBlock array at all —
 * unparseable JSON or a non-array top level. The caller (writing-server) catches
 * this to trigger exactly one repair re-call before giving up. A parse that
 * succeeds while dropping a few junk blocks is NOT this error.
 */
export class ContentBlockParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentBlockParseError";
  }
}

/** Terminal writing failure — flips the article to 'failed' (which refunds the quota). */
export class KalamaiHardFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KalamaiHardFailure";
  }
}

// Every discriminant in the ContentBlock union. Membership alone clears the
// no-content blocks (divider, pricing, spacer); REQUIRED adds a field check for
// the ones a missing field would render empty or crash.
const KNOWN_TYPES = new Set<string>([
  "h2", "h3", "h4", "lead", "p", "small", "caption",
  "ul", "ol", "tasklist",
  "figure", "figures", "gallery", "video", "audio",
  "quote", "pullquote",
  "code",
  "table", "comparisonTable", "pricing",
  "callout",
  "faq", "tabs", "expand",
  "socialEmbed", "map",
  "statCards", "metricsGrid", "progress", "comparisonCards",
  "divider", "spacer", "tags",
  "cta", "newsletter", "download", "buttonGroup",
  "takeaways", "summary", "prosCons", "steps", "timeline", "references", "footnotes",
  "authorNote", "expertInsight", "relatedCard", "resourceList", "quickFacts",
]);

// Primary required field(s) per block the writer actually emits. A block whose
// type is known but not listed here passes on the type check alone.
const REQUIRED: Record<string, string[]> = {
  h2: ["text"], h3: ["text"], h4: ["text"], lead: ["text"], p: ["text"], small: ["text"], caption: ["text"],
  ul: ["items"], ol: ["items"], tasklist: ["items"],
  quote: ["text"], pullquote: ["text"],
  code: ["code"],
  table: ["columns", "rows"], comparisonTable: ["columns", "rows"],
  callout: ["text"],
  faq: ["items"], tabs: ["items"], expand: ["content"],
  statCards: ["stats"], metricsGrid: ["metrics"], progress: ["value"],
  tags: ["items"],
  cta: ["title", "text", "button", "href"], newsletter: ["title", "text"], download: ["title", "description"],
  buttonGroup: ["buttons"],
  takeaways: ["items"], summary: ["text"], prosCons: ["pros", "cons"], steps: ["items"], timeline: ["items"],
  references: ["items"], footnotes: ["items"], resourceList: ["items"], quickFacts: ["facts"],
  authorNote: ["text"], expertInsight: ["name", "quote"], relatedCard: ["slug"],
};

function isValidBlock(b: unknown): b is ContentBlock {
  if (typeof b !== "object" || b === null || Array.isArray(b)) return false;
  const rec = b as Record<string, unknown>;
  const type = rec.type;
  if (typeof type !== "string" || !KNOWN_TYPES.has(type)) return false;
  for (const key of REQUIRED[type] ?? []) {
    if (rec[key] === undefined || rec[key] === null) return false;
  }
  return true;
}

// Models frequently wrap the array in a ```json fence despite instructions.
function stripFence(raw: string): string {
  const t = raw.trim();
  const fence = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fence ? fence[1].trim() : t;
}

/**
 * Parse model output into a ContentBlock array, dropping blocks that fail
 * validation rather than rejecting the whole article. Throws
 * ContentBlockParseError only when nothing can be parsed as an array.
 */
export function parseContentBlocks(raw: string): ContentBlock[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    // Salvage: strip any preamble/trailing prose (or a fence the lazy regex
    // mis-matched because the article text itself contains a ``` block) by
    // taking the outermost [ … ] span and parsing that.
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) throw new ContentBlockParseError("output was not valid JSON");
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      throw new ContentBlockParseError("output was not valid JSON");
    }
  }
  if (!Array.isArray(parsed)) {
    throw new ContentBlockParseError("output was not a JSON array");
  }
  return parsed.filter(isValidBlock);
}

/**
 * Parse model output, and on a ContentBlockParseError re-call the model exactly
 * once via `repair` before giving up. A second unparseable result is a
 * KalamaiHardFailure. Junk-block dropping inside parseContentBlocks never
 * triggers a repair — only a total parse failure does.
 */
export async function parseWithRepair(
  raw: string,
  repair: () => Promise<string>,
): Promise<ContentBlock[]> {
  try {
    return parseContentBlocks(raw);
  } catch (e) {
    if (!(e instanceof ContentBlockParseError)) throw e;
    const retry = await repair();
    try {
      return parseContentBlocks(retry);
    } catch {
      throw new KalamaiHardFailure("content blocks unparseable after one repair");
    }
  }
}
