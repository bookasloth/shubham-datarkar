import { describe, it, expect } from "vitest";
import { pick, type AutoKind } from "./templates";

const KINDS: AutoKind[] = ["blog", "caseStudy", "update", "supporter", "supporterMilestone", "pr"];

describe("auto templates", () => {
  it("fills placeholders and leaves none behind", () => {
    for (const kind of KINDS) {
      for (let i = 0; i < 40; i++) {
        const out = pick(kind, { title: "My Title", url: "https://x.test/y", n: 50 });
        expect(out.length).toBeGreaterThan(0);
        expect(out).not.toMatch(/\{(title|url|n)\}/);
        expect(out.length).toBeLessThanOrEqual(500);
      }
    }
  });

  it("uses the interpolated values", () => {
    const out = pick("supporterMilestone", { url: "https://x.test/support", n: 25 });
    expect(out).toContain("25");
    expect(out).toContain("https://x.test/support");
  });
});
