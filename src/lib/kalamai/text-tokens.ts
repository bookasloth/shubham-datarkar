// Candidate generation for distill v2: tokenize → Hinglish-normalize → 1-3 grams
// (stopword-filtered) → n-gram double-count suppression. Shared by distill and the
// corpus background-frequency computation so SERP and background counts are
// comparable. See docs/kalamai/spec/distill.md.

import { buildNormalizer } from "./hinglish";

// English + a few Hinglish stopwords. A gram is dropped if its first or last token
// is a stopword, so "content marketing" survives but "for the" doesn't.
const STOP = new Set(
  ("a an the and or but of for to in on at by with from as is are was were be been being this that these those " +
    "it its we you they he she i me my our your their them us do does did have has had will would can could should " +
    "not no yes so if then than too very just also more most other some any all how what why when where which who " +
    "ka ke ki ko hai ho na se me mein aur ya bhi par is se ye wo")
    .split(/\s+/),
);

export function rawTokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length >= 2 || /^\d+$/.test(t));
}

/** Build a shared normalizer from a corpus, then return each doc's normalized tokens. */
export function buildCorpusTokens(docs: string[]): { normalizer: (t: string) => string; docTokens: string[][] } {
  const perDoc = docs.map(rawTokens);
  const rawCounts = new Map<string, number>();
  for (const toks of perDoc) for (const t of toks) rawCounts.set(t, (rawCounts.get(t) ?? 0) + 1);
  const normalizer = buildNormalizer(rawCounts);
  return { normalizer, docTokens: perDoc.map((toks) => toks.map(normalizer)) };
}

export function grams(tokens: string[], maxN = 3): string[] {
  const out: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const slice = tokens.slice(i, i + n);
      if (STOP.has(slice[0]) || STOP.has(slice[slice.length - 1])) continue;
      out.push(slice.join(" "));
    }
  }
  return out;
}

export function countMap(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

export function ngramOf(term: string): number {
  return term.split(" ").length;
}

/**
 * Background term frequencies for distill's log-odds prior (corpus module 3b).
 * Same pipeline as distill's SERP side (buildCorpusTokens → grams → count) so
 * bgCounts/bgTotal are directly comparable to serpCounts/serpTotal. NO subgram
 * suppression here — distill suppresses only the SERP side and looks background
 * terms up by exact key. `totalTokens` sums ALL gram counts (matches distill's
 * serpTotal); `minCount` prunes which rows get STORED but does not change the
 * total, so pruned rare grams simply resolve to y_bg=0 downstream.
 */
export function backgroundFrequencies(
  docs: string[],
  minCount = 1,
): { terms: { term: string; ngram: number; count: number }[]; totalTokens: number; docCount: number } {
  const { docTokens } = buildCorpusTokens(docs);
  const counts = new Map<string, number>();
  for (const toks of docTokens) {
    for (const [term, c] of countMap(grams(toks))) counts.set(term, (counts.get(term) ?? 0) + c);
  }
  let totalTokens = 0;
  for (const c of counts.values()) totalTokens += c;
  const terms = [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([term, count]) => ({ term, ngram: ngramOf(term), count }));
  return { terms, totalTokens, docCount: docs.length };
}

/**
 * N-gram double-count suppression: if a longer gram's count ≥ 0.8× a contained
 * shorter gram's count, the phrase carries the signal — suppress the shorter gram.
 * Returns the set of terms to drop.
 */
export function suppressedSubgrams(counts: Map<string, number>): Set<string> {
  const suppressed = new Set<string>();
  for (const [term, longCount] of counts) {
    const parts = term.split(" ");
    if (parts.length < 2) continue;
    for (let n = 1; n < parts.length; n++) {
      for (let i = 0; i + n <= parts.length; i++) {
        const sub = parts.slice(i, i + n).join(" ");
        if (sub === term) continue;
        const subCount = counts.get(sub);
        if (subCount !== undefined && longCount >= 0.8 * subCount) suppressed.add(sub);
      }
    }
  }
  return suppressed;
}
