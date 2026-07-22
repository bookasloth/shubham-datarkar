import { describe, it, expect } from "vitest";
import { SEO_TIPS } from "./seo-tips";

describe("SEO_TIPS", () => {
  it("has exactly 100 tips", () => {
    expect(SEO_TIPS).toHaveLength(100);
  });
  it("are all non-empty single-line strings", () => {
    for (const t of SEO_TIPS) {
      expect(t.trim().length).toBeGreaterThan(0);
      expect(t).not.toContain("\n");
    }
  });
  it("are unique", () => {
    expect(new Set(SEO_TIPS).size).toBe(SEO_TIPS.length);
  });
});
