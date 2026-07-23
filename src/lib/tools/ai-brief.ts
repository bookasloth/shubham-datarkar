import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { parseBrief, type ContentBrief } from "./brief-parse";

/** Haiku only — a public, high-volume tool, not a reasoning task. */
const MODEL = "claude-haiku-4-5-20251001";
const MAX_INPUT = 120; // a keyword phrase, not an essay

export type { ContentBrief };

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

/**
 * Generate a real SEO content brief for a target keyword via Claude Haiku.
 * Throws on empty input, missing API key, or a model/parse failure — the caller
 * maps that to a safe user message.
 */
export async function aiContentBrief(keyword: string): Promise<ContentBrief> {
  const kw = keyword.trim().slice(0, MAX_INPUT);
  if (!kw) throw new Error("empty");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("unconfigured");

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1100,
    system:
      "You are an SEO content strategist. Given a target keyword, produce a content brief a writer can execute. " +
      "Respond with ONLY a JSON object, no prose, matching exactly: " +
      '{"title": suggested article title, "intent": one-line search intent, ' +
      '"wordCount": recommended range like "1,800-2,400", ' +
      '"outline": [{"heading": H2 heading, "points": [2-4 sub-points]}] (5-8 sections), ' +
      '"questions": [3-6 People-Also-Ask style questions to answer], ' +
      '"keywords": [5-10 related/secondary keywords]}.',
    messages: [{ role: "user", content: `Target keyword: ${kw}` }],
  });

  const block = res.content.find((b) => b.type === "text");
  const out = block && block.type === "text" ? block.text : "";
  return parseBrief(out);
}
