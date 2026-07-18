import "server-only";

// Gemini text-embedding-004 (768-dim). Called via REST — no SDK dependency.
// Model + dim are PINNED and stored per chunk row; changing the model
// invalidates every stored vector. Fake mode (no key, or KALAMAI_FAKE_EMBED=1)
// returns deterministic hashed vectors so clustering/scoring run offline.
// See docs/kalamai/spec/extract.md.

export const EMBED_MODEL = "text-embedding-004";
export const EMBED_DIM = 768;

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`;
const BATCH = 100; // Gemini batchEmbedContents request cap

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function isFakeEmbed(): boolean {
  return process.env.KALAMAI_FAKE_EMBED === "1" || !process.env.GEMINI_API_KEY;
}

/** Deterministic unit vector from text — stable across runs, similar text ≈ similar vector. */
function fakeVector(text: string): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  for (let i = 0; i < text.length; i++) v[i % EMBED_DIM] += text.charCodeAt(i);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

async function embedBatch(texts: string[], taskType: EmbedTaskType): Promise<number[][]> {
  const res = await fetch(`${ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
      })),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`gemini_embed_failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { embeddings?: { values: number[] }[] };
  const out = json.embeddings?.map((e) => e.values) ?? [];
  if (out.length !== texts.length) throw new Error(`gemini_embed_count_mismatch: ${out.length}/${texts.length}`);
  return out;
}

/**
 * Embed texts in batches of 100 with retry/backoff. Returns one 768-dim vector
 * per input, order-preserved. Fake mode returns deterministic hashed vectors.
 */
export async function embedTexts(texts: string[], taskType: EmbedTaskType): Promise<number[][]> {
  if (!texts.length) return [];
  if (isFakeEmbed()) return texts.map(fakeVector);

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        out.push(...(await embedBatch(slice, taskType)));
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); // backoff (free-tier rpm)
      }
    }
    if (lastErr) throw lastErr;
  }
  return out;
}

/** pgvector literal for a Postgres `vector` column, e.g. "[0.1,0.2,...]". */
export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}
