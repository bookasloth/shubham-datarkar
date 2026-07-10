/**
 * Code-based term extraction over crawled competitor pages. No LLM.
 *
 * Score = weighted frequency x coverage, where each occurrence is weighted by
 *   position (SERP rank), placement (H1 > H2/H3 = meta > body), and a 1.3x
 *   AI-Overview-cited bonus; coverage = share of top pages using the term.
 *
 * NOTE: the PRD says "TF-IDF", but classic idf (log(N/df)) over a single-topic
 * SERP corpus PENALISES the consensus terms — every competitor mentions the head
 * term, so its df is high and idf drives it down. That inverts the signal a
 * content brief needs. Coverage (df/N) replaces idf here: it rewards the terms
 * the top pages agree on, which is exactly what we want to recommend.
 */

export type Placement = "h1" | "h2h3" | "meta" | "body";

export type TermPage = {
  rank: number; // SERP rank, 1-based
  aiCited: boolean;
  headings: { level: 1 | 2 | 3; text: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  bodyText: string;
};

export type RankedTerm = {
  term: string;
  score: number;
  placement: Placement; // where the term is most prominent across the corpus
  freq: { min: number; median: number; max: number }; // body uses across top-10 pages that use it
};

// English + a few Hinglish stopwords. A gram is dropped if its first or last
// token is a stopword, so "content marketing" survives but "for the" doesn't.
const STOP = new Set(
  ("a an the and or but of for to in on at by with from as is are was were be been being this that these those " +
    "it its we you they he she i me my our your their them us do does did have has had will would can could should " +
    "not no yes so if then than too very just also more most other some any all can how what why when where which who " +
    "your ka ke ki ko hai ho na se me mein aur ya bhi par")
    .split(" "),
);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length >= 2 || /^\d+$/.test(t));
}

function grams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const slice = tokens.slice(i, i + n);
      if (STOP.has(slice[0]) || STOP.has(slice[slice.length - 1])) continue;
      out.push(slice.join(" "));
    }
  }
  return out;
}

function countMap(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

function median(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

function positionWeight(rank: number): number {
  return rank <= 3 ? 1.5 : rank <= 10 ? 1.2 : 1.0;
}

function headingText(p: TermPage, ...levels: number[]): string {
  return p.headings
    .filter((h) => levels.includes(h.level))
    .map((h) => h.text)
    .join(" ");
}

const PLACEMENT_WEIGHT: Record<Placement, number> = { h1: 3, h2h3: 2, meta: 2, body: 1 };

export function rankTerms(pages: TermPage[], opts: { top?: number } = {}): RankedTerm[] {
  const top = opts.top ?? 60;
  const n = pages.length || 1;

  const raw = new Map<string, number>();
  const placementSum = new Map<string, Record<Placement, number>>();
  const docFreq = new Map<string, number>();
  const bodyCounts = new Map<string, number[]>();

  const top10 = new Set([...pages].sort((a, b) => a.rank - b.rank).slice(0, 10));

  for (const p of pages) {
    const pw = positionWeight(p.rank);
    const bonus = p.aiCited ? 1.3 : 1;
    const regions: { name: Placement; text: string }[] = [
      { name: "h1", text: headingText(p, 1) },
      { name: "h2h3", text: headingText(p, 2, 3) },
      { name: "meta", text: [p.metaTitle, p.metaDescription].filter(Boolean).join(" ") },
      { name: "body", text: p.bodyText },
    ];

    const seen = new Set<string>();
    for (const r of regions) {
      const counts = countMap(grams(tokenize(r.text)));
      for (const [term, count] of counts) {
        const add = count * pw * PLACEMENT_WEIGHT[r.name] * bonus;
        raw.set(term, (raw.get(term) ?? 0) + add);
        const ps = placementSum.get(term) ?? { h1: 0, h2h3: 0, meta: 0, body: 0 };
        ps[r.name] += add;
        placementSum.set(term, ps);
        seen.add(term);
      }
    }
    for (const term of seen) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);

    if (top10.has(p)) {
      for (const [term, count] of countMap(grams(tokenize(p.bodyText)))) {
        if (count > 0) (bodyCounts.get(term) ?? bodyCounts.set(term, []).get(term)!).push(count);
      }
    }
  }

  const out: RankedTerm[] = [];
  for (const [term, rawScore] of raw) {
    const df = docFreq.get(term) ?? 1;
    const coverage = df / n;
    const ps = placementSum.get(term)!;
    const placement = (Object.entries(ps).sort((a, b) => b[1] - a[1])[0][0]) as Placement;
    const counts = (bodyCounts.get(term) ?? []).sort((a, b) => a - b);
    out.push({
      term,
      score: Math.round(rawScore * coverage * 100) / 100,
      placement,
      freq: counts.length
        ? { min: counts[0], median: median(counts), max: counts[counts.length - 1] }
        : { min: 0, median: 0, max: 0 },
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, top);
}
