import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { chooseNote, type NoteDrafts, type PrBrief } from "./pr";
import { VOICE_SYSTEM } from "./voice";

/** Cheap, fast, and good enough — quality comes from the voice prompt + examples. */
const NOTE_MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | undefined;
function getClient(): Anthropic {
  return (client ??= new Anthropic());
}

/** No key (or explicit flag) → return null so the caller falls back to the template pool. */
function isFake(): boolean {
  return !process.env.ANTHROPIC_API_KEY || process.env.NOTES_FAKE_LLM === "1";
}

// Two drafts + a judged winner, in one call. json_schema keeps the single text block
// parseable; additionalProperties:false is required by the API.
const NOTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    draft_a: { type: "string" },
    draft_b: { type: "string" },
    winner: { type: "string", enum: ["a", "b"] },
    reason: { type: "string" },
  },
  required: ["draft_a", "draft_b", "winner", "reason"],
} as const;

/**
 * Write one PR note in the founder's voice via Haiku: two drafts, judged, winner
 * returned. Best-effort — any failure (no key, API error, bad output) returns null
 * so the webhook falls back to the template pool. Never throws.
 */
export async function writeNote(brief: PrBrief): Promise<string | null> {
  if (isFake()) return null;
  try {
    const res = await getClient().messages.create({
      model: NOTE_MODEL,
      max_tokens: 1024,
      // thinking omitted: on Haiku 4.5 that means no thinking (the cheap path).
      output_config: { format: { type: "json_schema", schema: NOTE_SCHEMA } },
      system: VOICE_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(brief) }],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const judged = JSON.parse(text) as NoteDrafts;
    const note = chooseNote(judged);
    if (!note) {
      console.warn("[notes] both drafts invalid, falling back", brief.title);
      return null;
    }
    // Log the verdict (server only, never the feed) so the judgment is auditable.
    console.info(
      "[notes]",
      JSON.stringify({ pr: brief.title, winner: judged.winner, reason: judged.reason, note }),
    );
    return note;
  } catch (e) {
    console.warn("[notes] writeNote failed, falling back", brief.title, (e as Error).message);
    return null;
  }
}
