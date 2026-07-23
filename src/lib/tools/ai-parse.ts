/**
 * Parse + coerce a model's response into a safe AiAnalysis. Pure (no
 * `server-only`) so it's unit-testable — models return imperfect JSON, so this
 * is where robustness lives: pull the JSON object out of any surrounding prose
 * and clamp/validate every field.
 */
export type AiAnalysis = {
  score: number;
  summary: string;
  checks: { label: string; verdict: "good" | "improve" }[];
  suggestions: string[];
};

/** Extract the first {...} JSON object from arbitrary model text. Throws if none. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}

export function coerce(raw: unknown): AiAnalysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const score = Math.max(0, Math.min(100, Math.round(Number(o.score) || 0)));
  const summary = typeof o.summary === "string" ? o.summary : "";
  const checks = Array.isArray(o.checks)
    ? o.checks
        .map((c) => c as Record<string, unknown>)
        .filter((c) => typeof c.label === "string")
        .slice(0, 6)
        .map((c) => ({ label: String(c.label), verdict: c.verdict === "good" ? ("good" as const) : ("improve" as const) }))
    : [];
  const suggestions = Array.isArray(o.suggestions)
    ? o.suggestions.filter((s): s is string => typeof s === "string").slice(0, 5)
    : [];
  return { score, summary, checks, suggestions };
}

/** Parse a raw model text response straight to a safe AiAnalysis. */
export function parseAnalysis(text: string): AiAnalysis {
  return coerce(extractJson(text));
}
