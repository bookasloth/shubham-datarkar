// Split body text into ~200-token chunks on sentence boundaries, for embedding.
// Token count is a cheap chars/4 heuristic — exact tokenization isn't needed to
// decide chunk boundaries. See docs/kalamai/spec/extract.md.

export type Chunk = { index: number; text: string; tokenCount: number };

const TARGET = 200;
const FLUSH = 180; // flush once a chunk reaches this many tokens
const MIN = 30; // drop/merge chunks smaller than this
const MAX = 256; // hard cap

export function estTokens(s: string): number {
  return Math.ceil(s.trim().length / 4);
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

// Word-split a single oversized sentence so no chunk exceeds MAX tokens.
function splitLong(sentence: string): string[] {
  if (estTokens(sentence) <= MAX) return [sentence];
  const words = sentence.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (estTokens(cand) > MAX && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function chunkText(text: string): Chunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const sentences = splitSentences(clean).flatMap(splitLong);
  const raw: string[] = [];
  let cur = "";
  for (const sent of sentences) {
    const cand = cur ? `${cur} ${sent}` : sent;
    if (estTokens(cand) > MAX && cur) {
      raw.push(cur);
      cur = sent;
    } else {
      cur = cand;
    }
    if (estTokens(cur) >= FLUSH) {
      raw.push(cur);
      cur = "";
    }
  }
  if (cur) raw.push(cur);

  // Merge a trailing tiny chunk into the previous one; drop a lone tiny chunk.
  const merged: string[] = [];
  for (const c of raw) {
    if (estTokens(c) < MIN && merged.length) merged[merged.length - 1] = `${merged[merged.length - 1]} ${c}`;
    else merged.push(c);
  }
  return merged
    .filter((t) => estTokens(t) >= MIN || merged.length === 1)
    .map((t, i) => ({ index: i, text: t, tokenCount: estTokens(t) }));
}
