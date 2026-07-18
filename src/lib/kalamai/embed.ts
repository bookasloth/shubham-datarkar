// Gemini gemini-embedding-001, truncated to 768-dim. Called via REST — no SDK.
// NOT marked server-only: also imported by the standalone corpus script (plain
// node). Never import into a client component (it reads GEMINI_API_KEY).
//
// Model + dim are PINNED and stored per chunk row; changing the model invalidates
// every stored vector. gemini-embedding-001 exposes embedContent (per-text), NOT
// batchEmbedContents, and at outputDimensionality < 3072 returns UN-normalized
// vectors — so we L2-normalize here (cosine + pgvector cosine ops need unit
// vectors). Fake mode (no key, or KALAMAI_FAKE_EMBED=1) returns deterministic
// hashed vectors so clustering/scoring run offline. See docs/kalamai/spec/extract.md.

export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIM = 768;

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;
const CONCURRENCY = 5; // parallel embedContent calls (free-tier rpm friendly)

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function isFakeEmbed(): boolean {
  return process.env.KALAMAI_FAKE_EMBED === "1" || !process.env.GEMINI_API_KEY;
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/** Deterministic unit vector from text — stable across runs, similar text ≈ similar vector. */
function fakeVector(text: string): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  for (let i = 0; i < text.length; i++) v[i % EMBED_DIM] += text.charCodeAt(i);
  return normalize(v);
}

async function embedOne(text: string, taskType: EmbedTaskType): Promise<number[]> {
  const res = await fetch(`${ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: { parts: [{ text }] }, taskType, outputDimensionality: EMBED_DIM }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`gemini_embed_failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { embedding?: { values: number[] } };
  const vals = json.embedding?.values;
  if (!Array.isArray(vals) || vals.length !== EMBED_DIM) throw new Error(`gemini_embed_bad_dim: ${vals?.length}`);
  return normalize(vals);
}

/**
 * Embed texts with bounded concurrency + retry/backoff. Returns one 768-dim unit
 * vector per input, order-preserved. Fake mode returns deterministic hashed vectors.
 */
export async function embedTexts(texts: string[], taskType: EmbedTaskType): Promise<number[][]> {
  if (!texts.length) return [];
  if (isFakeEmbed()) return texts.map(fakeVector);

  const out: number[][] = new Array(texts.length);
  let next = 0;
  const worker = async () => {
    while (next < texts.length) {
      const i = next++;
      let lastErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          out[i] = await embedOne(texts[i], taskType);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
      if (lastErr) throw lastErr;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, worker));
  return out;
}

/** pgvector literal for a Postgres `vector` column, e.g. "[0.1,0.2,...]". */
export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}
