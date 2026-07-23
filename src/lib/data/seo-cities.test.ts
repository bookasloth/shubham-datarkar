import { describe, it, expect } from "vitest";
import { seoCities, seoCitySlugs, getSeoCity } from "./seo-cities";

describe("seo-cities", () => {
  it("has unique slugs", () => {
    expect(new Set(seoCitySlugs).size).toBe(seoCities.length);
  });

  it("every city carries the required, non-empty differentiating fields", () => {
    for (const c of seoCities) {
      expect(c.city.length).toBeGreaterThan(0);
      expect(c.state.length).toBeGreaterThan(0);
      expect(c.lead.length).toBeGreaterThan(0);
      expect(c.market.length).toBeGreaterThan(40);
      expect(c.angle.length).toBeGreaterThan(40);
      expect(c.buyers.length).toBeGreaterThanOrEqual(1);
      expect(c.faqs.length).toBeGreaterThanOrEqual(2);
      for (const f of c.faqs) {
        expect(f.question.length).toBeGreaterThan(0);
        expect(f.answer.length).toBeGreaterThan(0);
      }
    }
  });

  it("market copy is materially distinct per city (no doorway duplication)", () => {
    const markets = seoCities.map((c) => c.market);
    expect(new Set(markets).size).toBe(markets.length);
  });

  it("getSeoCity resolves a known slug and rejects an unknown one", () => {
    expect(getSeoCity("nagpur")?.city).toBe("Nagpur");
    expect(getSeoCity("atlantis")).toBeUndefined();
  });
});
