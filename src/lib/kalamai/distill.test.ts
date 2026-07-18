import { describe, it, expect } from "vitest";
import { distill, type DistillPage, type ChunkVec } from "./distill";

const FILLER = "content strategy marketing plan audience growth channel campaign brand reach";
function page(rank: number, extra: string, reps = 3): DistillPage {
  const body = (`${FILLER} `.repeat(30) + ` ${extra} `.repeat(reps)).trim();
  return { rank, bodyText: body, wordCount: body.split(/\s+/).length };
}
const noBg = { counts: new Map<string, number>(), total: 0 };

describe("distill — coverage gate", () => {
  it("surfaces a term in ≥60% of competitors, drops one below", () => {
    // "widget" in 7/10, "gadget" in 5/10.
    const pages: DistillPage[] = [];
    for (let i = 0; i < 10; i++) {
      const extra = (i < 7 ? "widget " : "") + (i < 5 ? "gadget" : "");
      pages.push(page(i + 1, extra.trim() || "filleronly"));
    }
    const r = distill({ pages, targetLength: 1000, background: noBg, chunkVectors: [] });
    const surfaced = new Set(r.terms.map((t) => t.term));
    expect(surfaced.has("widget")).toBe(true); // 0.7 ≥ 0.6
    expect(surfaced.has("gadget")).toBe(false); // 0.5 < 0.6
    expect(r.noBackgroundCorpus).toBe(true);
  });
});

describe("distill — Hinglish normalization defeats variant-splitting", () => {
  it("merges nahi/nahin/nhi so the merged term clears the gate", () => {
    // 8 pages, the SAME word spelled 3 ways: 3× nahi, 3× nahin, 2× nhi.
    // Un-normalized each variant is ≤3/8 (<0.6) and would be dropped.
    const spellings = ["nahi", "nahi", "nahi", "nahin", "nahin", "nahin", "nhi", "nhi"];
    const pages = spellings.map((s, i) => page(i + 1, s));
    const r = distill({ pages, targetLength: 1000, background: noBg, chunkVectors: [] });
    const surfaced = new Set(r.terms.map((t) => t.term));
    expect(surfaced.has("nahi")).toBe(true); // merged → 8/8 coverage
    const nahi = r.terms.find((t) => t.term === "nahi")!;
    expect(nahi.coverage).toBeCloseTo(1, 5);
  });
});

describe("distill — target ranges", () => {
  it("computes freqLo ≤ freqHi scaled to target length", () => {
    const pages: DistillPage[] = [];
    for (let i = 0; i < 8; i++) pages.push(page(i + 1, "widget", 2 + (i % 3)));
    const r = distill({ pages, targetLength: 2000, background: noBg, chunkVectors: [] });
    const widget = r.terms.find((t) => t.term === "widget")!;
    expect(widget.freqLo).toBeLessThanOrEqual(widget.freqHi);
    expect(widget.freqHi).toBeGreaterThan(0);
  });
});

describe("distill — clusters", () => {
  it("produces clusters with a competitor count from chunk vectors", () => {
    const mk = (axis: number, comp: number): ChunkVec => {
      const v = new Array(8).fill(0);
      v[axis] = 1;
      return { vector: v, competitorIndex: comp, text: `subtopic about ${axis === 0 ? "seo" : "ppc"}.` };
    };
    const chunkVectors = [mk(0, 0), mk(0, 1), mk(0, 2), mk(4, 3), mk(4, 4), mk(4, 5)];
    const pages = Array.from({ length: 6 }, (_, i) => page(i + 1, "widget"));
    const r = distill({ pages, targetLength: 1000, background: noBg, chunkVectors });
    expect(r.clusters.length).toBeGreaterThanOrEqual(1);
    expect(r.clusters.every((c) => c.competitorCount >= 1)).toBe(true);
    expect(r.clusters.every((c) => c.centroid.length === 8)).toBe(true);
  });

  it("returns no clusters when there are too few chunks", () => {
    const r = distill({ pages: [page(1, "x")], targetLength: 1000, background: noBg, chunkVectors: [] });
    expect(r.clusters).toEqual([]);
    expect(r.lowConfidence).toBe(true); // <5 competitors
  });
});
