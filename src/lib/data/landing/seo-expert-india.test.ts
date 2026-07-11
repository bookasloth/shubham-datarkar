import { describe, it, expect } from "vitest";
import { seoExpertIndia } from "./seo-expert-india";

describe("seoExpertIndia content contract", () => {
  it("has the exact keyword-first H1", () => {
    expect(seoExpertIndia.h1).toBe("SEO Expert in India");
  });
  it("answer block is a self-contained 40-60 word passage", () => {
    const words = seoExpertIndia.answer.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
  });
  it("has exactly 7 service blocks with extractable definitions", () => {
    expect(seoExpertIndia.serviceBlocks).toHaveLength(7);
    for (const b of seoExpertIndia.serviceBlocks) expect(b.definition.length).toBeGreaterThan(40);
  });
  it("has three INR pricing tiers with positive numeric prices", () => {
    expect(seoExpertIndia.pricingTiers).toHaveLength(3);
    for (const t of seoExpertIndia.pricingTiers) {
      expect(t.currency).toBe("INR");
      expect(Number(t.price)).toBeGreaterThan(0);
    }
    expect(seoExpertIndia.pricingTiers.map((t) => t.price)).toEqual(["6999", "13999", "22999"]);
  });
  it("has 6-10 answer-first FAQs", () => {
    expect(seoExpertIndia.faqs.length).toBeGreaterThanOrEqual(6);
    expect(seoExpertIndia.faqs.length).toBeLessThanOrEqual(10);
  });
  it("carries a visible ISO updated date", () => {
    expect(seoExpertIndia.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
