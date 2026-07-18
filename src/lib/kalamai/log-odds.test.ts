import { describe, it, expect } from "vitest";
import { fightinWords } from "./log-odds";

describe("fightinWords", () => {
  it("gives high z to a term over-represented on the SERP vs background", () => {
    const serpCounts = new Map([["seo", 40], ["the", 100]]);
    const bgCounts = new Map([["seo", 5], ["the", 10000]]);
    const out = fightinWords({ serpCounts, serpTotal: 1000, bgCounts, bgTotal: 500000, alpha0: 500 });
    const seo = out.find((o) => o.term === "seo")!;
    const the = out.find((o) => o.term === "the")!;
    // "seo" is distinctive (rare in bg, common on SERP); "the" is generic → prior absorbs it.
    expect(seo.z).toBeGreaterThan(2);
    expect(seo.z).toBeGreaterThan(the.z);
    expect(Math.abs(the.z)).toBeLessThan(seo.z);
  });

  it("ranks output by z descending", () => {
    const out = fightinWords({
      serpCounts: new Map([["a", 30], ["b", 5]]),
      serpTotal: 200,
      bgCounts: new Map([["a", 2], ["b", 1000]]),
      bgTotal: 100000,
    });
    for (let i = 1; i < out.length; i++) expect(out[i - 1].z).toBeGreaterThanOrEqual(out[i].z);
  });

  it("falls back to a uniform prior when the background corpus is empty", () => {
    const out = fightinWords({
      serpCounts: new Map([["seo", 40], ["rare", 1]]),
      serpTotal: 100,
      bgCounts: new Map(),
      bgTotal: 0,
    });
    // Still functions: the more frequent SERP term outranks the rare one.
    expect(out[0].term).toBe("seo");
    expect(out.every((o) => Number.isFinite(o.z))).toBe(true);
  });
});
