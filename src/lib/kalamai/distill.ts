// distill v2 — term signals + semantic subtopic clusters (module 4).
// Log-odds (Fightin' Words) + hard 60% coverage gate + median/IQR target ranges
// + k-means/silhouette clustering. Kept ALONGSIDE the v1 rankTerms (D2); wired but
// shadow until the corpus + rank harness validate it. See docs/kalamai/spec/distill.md.

import { buildCorpusTokens, grams, countMap, ngramOf, suppressedSubgrams } from "./text-tokens";
import { fightinWords, DEFAULT_ALPHA0 } from "./log-odds";
import { selectClusters } from "./kmeans";

export const COVERAGE_GATE = 0.6; // hard [C] — a term must appear in ≥60% of competitors

export type DistillPage = { rank: number; bodyText: string; wordCount: number };
export type ChunkVec = { vector: number[]; competitorIndex: number; text: string };

export type TermSignal = {
  term: string;
  ngram: number;
  z: number;
  delta: number;
  docFreq: number;
  coverage: number;
  freqLo: number;
  freqHi: number;
};

export type DistillCluster = {
  id: number;
  centroid: number[];
  competitorCount: number;
  label: string;
  exemplarChunkIndexes: number[];
};

export type DistillResult = {
  terms: TermSignal[];
  clusters: DistillCluster[];
  lowConfidence: boolean;
  noBackgroundCorpus: boolean;
};

export type DistillInput = {
  pages: DistillPage[]; // selected competitors (ok, wordCount ≥ 250)
  targetLength: number;
  background: { counts: Map<string, number>; total: number }; // total=0 → uniform prior
  chunkVectors: ChunkVec[];
  coverageGate?: number;
  alpha0?: number;
  topN?: number;
};

function quantile(sortedAsc: number[], q: number): number {
  if (!sortedAsc.length) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sortedAsc[lo] : sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

export function distill(input: DistillInput): DistillResult {
  const gate = input.coverageGate ?? COVERAGE_GATE;
  const alpha0 = input.alpha0 ?? DEFAULT_ALPHA0;
  const topN = input.topN ?? 60;
  const nPages = input.pages.length;

  // 1. Normalize (Hinglish) + candidate grams per page.
  const { docTokens } = buildCorpusTokens(input.pages.map((p) => p.bodyText));
  const perPageCounts = docTokens.map((toks) => countMap(grams(toks)));

  // 2. Global SERP counts + document frequency.
  const serpCounts = new Map<string, number>();
  const docFreq = new Map<string, number>();
  for (const counts of perPageCounts) {
    for (const [term, c] of counts) {
      serpCounts.set(term, (serpCounts.get(term) ?? 0) + c);
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1); // once per doc (counts has unique keys)
    }
  }
  const serpTotal = [...serpCounts.values()].reduce((s, x) => s + x, 0);

  // 3. Coverage gate (hard) + n-gram double-count suppression.
  const suppressed = suppressedSubgrams(serpCounts);
  const gatedCounts = new Map<string, number>();
  for (const [term, c] of serpCounts) {
    if (suppressed.has(term)) continue;
    if ((docFreq.get(term) ?? 0) / (nPages || 1) >= gate) gatedCounts.set(term, c);
  }

  // 4. Log-odds over the gated terms.
  const noBackgroundCorpus = input.background.total === 0;
  const logOdds = fightinWords({
    serpCounts: gatedCounts,
    serpTotal,
    bgCounts: input.background.counts,
    bgTotal: input.background.total,
    alpha0,
  });

  // 5. Target ranges (median/IQR of per-1000-word frequency among containing competitors).
  const terms: TermSignal[] = logOdds.map((lo) => {
    const freqs: number[] = [];
    input.pages.forEach((p, i) => {
      const c = perPageCounts[i].get(lo.term) ?? 0;
      if (c > 0 && p.wordCount > 0) freqs.push((1000 * c) / p.wordCount);
    });
    freqs.sort((a, b) => a - b);
    const q1 = quantile(freqs, 0.25);
    const q3 = quantile(freqs, 0.75);
    return {
      term: lo.term,
      ngram: ngramOf(lo.term),
      z: lo.z,
      delta: lo.delta,
      docFreq: docFreq.get(lo.term) ?? 0,
      coverage: (docFreq.get(lo.term) ?? 0) / (nPages || 1),
      freqLo: (q1 * input.targetLength) / 1000,
      freqHi: (q3 * input.targetLength) / 1000,
    };
  });
  terms.sort((a, b) => b.z - a.z);

  // 6. Semantic subtopic clusters (k-means + silhouette). Empty if too few chunks.
  const clusters = buildClusters(input.chunkVectors);

  // 7. Confidence: thin SERP if fewer than 5 competitors.
  const lowConfidence = nPages < 5;

  return { terms: terms.slice(0, topN), clusters, lowConfidence, noBackgroundCorpus };
}

function buildClusters(chunkVectors: ChunkVec[]): DistillCluster[] {
  if (chunkVectors.length < 3) return [];
  const vectors = chunkVectors.map((c) => c.vector);
  const { assignments, centroids, k } = selectClusters(vectors);

  const clusters: DistillCluster[] = [];
  for (let c = 0; c < k; c++) {
    const idx = assignments.map((a, i) => (a === c ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    const competitors = new Set(idx.map((i) => chunkVectors[i].competitorIndex));
    clusters.push({
      id: c,
      centroid: centroids[c],
      competitorCount: competitors.size,
      label: chunkVectors[idx[0]].text.split(/[.!?]/)[0].slice(0, 120),
      exemplarChunkIndexes: idx.slice(0, 3),
    });
  }
  // Weight by breadth: most-covered subtopics first.
  clusters.sort((a, b) => b.competitorCount - a.competitorCount);
  return clusters;
}
