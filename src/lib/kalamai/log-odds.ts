// Weighted log-odds ratio with an informative Dirichlet prior — "Fightin' Words"
// (Monroe, Colaresi & Quinn 2008). Finds terms distinctively over-represented on
// a query's SERP vs a language-wide background, WITHOUT the consensus-penalty that
// plain TF-IDF inflicts on a single-topic SERP. See docs/kalamai/spec/distill.md.
//
//   α_w = α₀ · (bg_freq_w / bg_total)
//   δ_w = log((y_serp+α_w)/(n_serp+α₀−y_serp−α_w)) − log((y_bg+α_w)/(n_bg+α₀−y_bg−α_w))
//   var(δ_w) ≈ 1/(y_serp+α_w) + 1/(y_bg+α_w)
//   z_w = δ_w / sqrt(var(δ_w))

export const DEFAULT_ALPHA0 = 500; // prior mass; tune against the 500-kw corpus

export type LogOdds = { term: string; delta: number; z: number };

export type LogOddsInput = {
  serpCounts: Map<string, number>; // y_serp per term
  serpTotal: number; // n_serp (total tokens in SERP corpus)
  bgCounts: Map<string, number>; // y_bg per term (background corpus)
  bgTotal: number; // n_bg (total tokens in background corpus)
  alpha0?: number;
};

/**
 * Compute z-scored weighted log-odds for every term in serpCounts. When the
 * background corpus is empty (bgTotal === 0), falls back to a UNIFORM prior
 * (α_w = α₀ / vocabSize) — degrades toward raw over-representation but still
 * functions. Callers should flag `no_background_corpus` in that case.
 */
export function fightinWords(input: LogOddsInput): LogOdds[] {
  const { serpCounts, serpTotal, bgCounts, bgTotal, alpha0 = DEFAULT_ALPHA0 } = input;
  const hasBg = bgTotal > 0;
  const vocab = new Set<string>([...serpCounts.keys(), ...bgCounts.keys()]);
  const vocabSize = vocab.size || 1;

  const out: LogOdds[] = [];
  for (const [term, ySerp] of serpCounts) {
    const yBg = bgCounts.get(term) ?? 0;
    // Informative prior from background frequency; uniform when no background yet.
    const alphaW = hasBg ? alpha0 * ((yBg + 1) / (bgTotal + vocabSize)) : alpha0 / vocabSize;

    const serpNum = ySerp + alphaW;
    const serpDen = serpTotal + alpha0 - ySerp - alphaW;
    const bgNum = yBg + alphaW;
    const bgDen = bgTotal + alpha0 - yBg - alphaW;
    if (serpNum <= 0 || serpDen <= 0 || bgNum <= 0 || bgDen <= 0) continue;

    const delta = Math.log(serpNum / serpDen) - Math.log(bgNum / bgDen);
    const variance = 1 / (ySerp + alphaW) + 1 / (yBg + alphaW);
    const z = delta / Math.sqrt(variance);
    out.push({ term, delta, z });
  }
  out.sort((a, b) => b.z - a.z);
  return out;
}
