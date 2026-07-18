// k-means (k-means++ init) with silhouette-based k selection over k = 6..16 [D5].
// Deviation from the spec's HDBSCAN (no HDBSCAN in JS): silhouette-selected k
// adapts cluster count to query type — commercial SERP ~15 subtopics, definitional
// ~5 — where fixed k over/under-splits. Vectors are unit-normalized, so cosine
// similarity = dot product and cosine distance = 1 − dot. See docs/kalamai/spec/distill.md.

export type ClusterResult = {
  k: number;
  assignments: number[]; // cluster index per vector
  centroids: number[][]; // unit-normalized
  silhouette: number;
};

// Seeded RNG (mulberry32) so clustering is reproducible across runs/tests.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
const cosDist = (a: number[], b: number[]) => 1 - dot(a, b);

function normalize(v: number[]): number[] {
  const n = Math.sqrt(dot(v, v)) || 1;
  return v.map((x) => x / n);
}

function meanUnit(vectors: number[][], idx: number[]): number[] {
  const dim = vectors[0].length;
  const c = new Array(dim).fill(0);
  for (const i of idx) for (let d = 0; d < dim; d++) c[d] += vectors[i][d];
  return normalize(c);
}

// k-means++ seeding by cosine distance.
function seedPlusPlus(vectors: number[][], k: number, rand: () => number): number[][] {
  const first = Math.floor(rand() * vectors.length);
  const centroids = [vectors[first]];
  while (centroids.length < k) {
    const d2 = vectors.map((v) => {
      const nearest = Math.min(...centroids.map((c) => cosDist(v, c)));
      return nearest * nearest;
    });
    const sum = d2.reduce((s, x) => s + x, 0) || 1;
    let r = rand() * sum;
    let pick = 0;
    for (let i = 0; i < d2.length; i++) {
      r -= d2[i];
      if (r <= 0) { pick = i; break; }
    }
    centroids.push(vectors[pick]);
  }
  return centroids.map((c) => [...c]);
}

export function kmeans(vectors: number[][], k: number, iters = 25, seed = 1): { assignments: number[]; centroids: number[][] } {
  let centroids = seedPlusPlus(vectors, k, rng(seed));
  const assignments = new Array(vectors.length).fill(0);
  for (let it = 0; it < iters; it++) {
    let moved = false;
    for (let i = 0; i < vectors.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = cosDist(vectors[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; moved = true; }
    }
    for (let c = 0; c < k; c++) {
      const idx = [];
      for (let i = 0; i < vectors.length; i++) if (assignments[i] === c) idx.push(i);
      if (idx.length) centroids[c] = meanUnit(vectors, idx);
    }
    if (!moved && it > 0) break;
  }
  return { assignments, centroids };
}

export function silhouette(vectors: number[][], assignments: number[], k: number): number {
  const n = vectors.length;
  if (k < 2 || n <= k) return 0;
  const byCluster: number[][] = Array.from({ length: k }, () => []);
  assignments.forEach((c, i) => byCluster[c].push(i));

  let total = 0, counted = 0;
  for (let i = 0; i < n; i++) {
    const own = byCluster[assignments[i]];
    if (own.length <= 1) continue; // singleton → s=0, skip
    const a = own.filter((j) => j !== i).reduce((s, j) => s + cosDist(vectors[i], vectors[j]), 0) / (own.length - 1);
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === assignments[i] || byCluster[c].length === 0) continue;
      const mean = byCluster[c].reduce((s, j) => s + cosDist(vectors[i], vectors[j]), 0) / byCluster[c].length;
      b = Math.min(b, mean);
    }
    if (b === Infinity) continue;
    total += (b - a) / Math.max(a, b);
    counted++;
  }
  return counted ? total / counted : 0;
}

/**
 * Pick the best k in [kMin, kMax] by mean silhouette. Caps kMax at n−1; for very
 * small n (< kMin+1) returns a single cluster. Deterministic (seeded).
 */
export function selectClusters(vectors: number[][], kMin = 6, kMax = 16): ClusterResult {
  const n = vectors.length;
  if (n < 2) return { k: 1, assignments: new Array(n).fill(0), centroids: n ? [meanUnit(vectors, [0])] : [], silhouette: 0 };
  const hi = Math.min(kMax, n - 1);
  const lo = Math.min(kMin, hi);

  let best: ClusterResult | null = null;
  for (let k = lo; k <= hi; k++) {
    const { assignments, centroids } = kmeans(vectors, k);
    const s = silhouette(vectors, assignments, k);
    if (!best || s > best.silhouette) best = { k, assignments, centroids, silhouette: s };
  }
  return best ?? { k: 1, assignments: new Array(n).fill(0), centroids: [meanUnit(vectors, vectors.map((_, i) => i))], silhouette: 0 };
}
