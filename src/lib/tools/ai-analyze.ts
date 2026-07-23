import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { parseAnalysis, type AiAnalysis } from "./ai-parse";

/** Haiku only — these are cheap, high-volume public tools, not a reasoning task. */
const MODEL = "claude-haiku-4-5-20251001";
const MAX_INPUT = 4000; // char cap — keeps cost bounded on a public endpoint

export type AnalyzeKind = "copy-analyzer" | "headline-tester";
export type { AiAnalysis };

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

const PROMPTS: Record<AnalyzeKind, { role: string; asks: string }> = {
  "copy-analyzer": {
    role: "a senior conversion copywriter",
    asks:
      "Analyze this landing-page or marketing copy. Judge headline strength, clarity of the value proposition, and which buyer objections go unanswered.",
  },
  "headline-tester": {
    role: "a headline and hook expert",
    asks:
      "Score this headline for clarity (is it instantly understood), curiosity (a reason to click), and search intent (does it match what people look for). Then rewrite it better.",
  },
};

/**
 * Real copy/headline analysis via Claude Haiku. Returns a structured verdict.
 * Throws on empty input, missing API key, or a model/parse failure — the caller
 * maps that to a safe user message.
 */
export async function aiAnalyze(kind: AnalyzeKind, input: string): Promise<AiAnalysis> {
  const text = input.trim().slice(0, MAX_INPUT);
  if (!text) throw new Error("empty");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("unconfigured");

  const p = PROMPTS[kind];
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 700,
    system:
      `You are ${p.role}. ${p.asks} Respond with ONLY a JSON object, no prose, matching exactly: ` +
      `{"score": number 0-100, "summary": one-sentence verdict, ` +
      `"checks": [{"label": short check name, "verdict": "good" | "improve"}] (3-5 items), ` +
      `"suggestions": [2-3 concrete rewrites or fixes as strings]}.`,
    messages: [{ role: "user", content: text }],
  });

  const block = res.content.find((b) => b.type === "text");
  const out = block && block.type === "text" ? block.text : "";
  return parseAnalysis(out);
}
