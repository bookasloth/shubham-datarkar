import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/** Every KalamAI call runs on Sonnet 5 with thinking disabled (cost ceiling). */
export const KALAMAI_MODEL = "claude-sonnet-5";

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  ms: number;
};

const ZERO_USAGE: LlmUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd: 0,
  ms: 0,
};

let client: Anthropic | undefined;
function getClient(): Anthropic {
  return (client ??= new Anthropic());
}

/** No key (or explicit flag) → canned fixtures, zero spend. Powers offline tests + dev. */
export function isFakeLlm(): boolean {
  return !process.env.ANTHROPIC_API_KEY || process.env.KALAMAI_FAKE_LLM === "1";
}

// Standard Sonnet 5 pricing (upper bound; intro pricing through 2026-08-31 is cheaper).
// $3 in / $15 out per MTok; cache read 0.1x, cache write 1.25x.
function costUsd(u: Omit<LlmUsage, "costUsd" | "ms">): number {
  const M = 1_000_000;
  return (u.inputTokens * 3 + u.outputTokens * 15 + u.cacheReadTokens * 0.3 + u.cacheWriteTokens * 3.75) / M;
}

function toUsage(u: Anthropic.Usage, ms: number): LlmUsage {
  const base = {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
  return { ...base, costUsd: costUsd(base), ms };
}

/**
 * One structured-JSON call. `output_config.format` constrains the model to emit
 * schema-valid JSON, so the single text block parses cleanly. Non-streaming is
 * safe here: outputs are <= 4K tokens, well under the streaming timeout threshold.
 * In fake mode returns the caller-supplied fixture.
 */
export async function runJson<T>(args: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  fake: T;
}): Promise<{ data: T; usage: LlmUsage }> {
  if (isFakeLlm()) return { data: args.fake, usage: ZERO_USAGE };

  const started = Date.now();
  const res = await getClient().messages.create({
    model: KALAMAI_MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: { effort: args.effort ?? "low", format: { type: "json_schema", schema: args.schema } },
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });

  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const data = JSON.parse(text) as T;
  return { data, usage: toUsage(res.usage, Date.now() - started) };
}
