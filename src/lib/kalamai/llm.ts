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
  cachePrefix?: string;
  fake: T;
}): Promise<{ data: T; usage: LlmUsage }> {
  if (isFakeLlm()) return { data: args.fake, usage: ZERO_USAGE };

  const started = Date.now();
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: args.system }];
  if (args.cachePrefix) {
    system.push({ type: "text", text: args.cachePrefix, cache_control: { type: "ephemeral" } });
  }
  const res = await getClient().messages.create({
    model: KALAMAI_MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: { effort: args.effort ?? "low", format: { type: "json_schema", schema: args.schema } },
    system,
    messages: [{ role: "user", content: args.user }],
  });

  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const data = JSON.parse(text) as T;
  return { data, usage: toUsage(res.usage, Date.now() - started) };
}

/**
 * One free-form text call for the writing engine, where structured output can't
 * be used (ContentBlock is a recursive union). `cachePrefix` — the compressed
 * brief — is marked `cache_control: ephemeral` so W1 writes it and W2-W4 read it
 * at 0.1x; keep it byte-identical across pokes or the cache misses and the
 * article costs ~3x. Streamed and resolved via `.finalMessage()` because these
 * calls run 15-40s and emit >16K tokens, past the non-streaming SDK timeout.
 */
export async function runText(args: {
  system: string;
  user: string;
  cachePrefix?: string;
  maxTokens?: number;
  fake: string;
}): Promise<{ text: string; usage: LlmUsage }> {
  if (isFakeLlm()) return { text: args.fake, usage: ZERO_USAGE };

  const started = Date.now();
  const system: Anthropic.TextBlockParam[] = [{ type: "text", text: args.system }];
  if (args.cachePrefix) {
    system.push({ type: "text", text: args.cachePrefix, cache_control: { type: "ephemeral" } });
  }

  const message = await getClient()
    .messages.stream({
      model: KALAMAI_MODEL,
      max_tokens: args.maxTokens ?? 16000,
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: args.user }],
    })
    .finalMessage();

  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { text, usage: toUsage(message.usage, Date.now() - started) };
}
