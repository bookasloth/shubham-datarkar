/**
 * Parse + coerce a model response into a safe ContentBrief. Pure (no
 * `server-only`) so it's unit-testable — models return imperfect JSON, so every
 * field is validated and defaulted here.
 */
export type ContentBrief = {
  title: string;
  intent: string;
  wordCount: string;
  outline: { heading: string; points: string[] }[];
  questions: string[];
  keywords: string[];
};

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function strList(v: unknown, cap: number, max = 200): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim().slice(0, max)).filter(Boolean).slice(0, cap) : [];
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}

export function coerceBrief(raw: unknown): ContentBrief {
  const o = (raw ?? {}) as Record<string, unknown>;
  const outline = Array.isArray(o.outline)
    ? o.outline
        .map((s) => s as Record<string, unknown>)
        .filter((s) => typeof s.heading === "string")
        .slice(0, 12)
        .map((s) => ({ heading: str(s.heading, 160), points: strList(s.points, 6) }))
    : [];
  return {
    title: str(o.title, 160),
    intent: str(o.intent, 300),
    wordCount: str(o.wordCount, 40),
    outline,
    questions: strList(o.questions, 8),
    keywords: strList(o.keywords, 12, 60),
  };
}

export function parseBrief(text: string): ContentBrief {
  return coerceBrief(extractJson(text));
}
