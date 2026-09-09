import { describe, it, expect } from "vitest";
import { fallbackReport } from "./job-server";
import type { Finding } from "./types";

const f = (over: Partial<Finding>): Finding => ({
  id: "x", title: "T", problem: "p", why: "w", evidence: "e", affectedUrls: [], severity: "high", category: "seo", recommendation: "Do the thing", source: "deterministic", ...over,
});

describe("fallbackReport (used when LLM synthesis fails)", () => {
  it("turns deterministic findings into a usable report", () => {
    const r = fallbackReport([f({ title: "A" }), f({ title: "B" }), f({ title: "C" }), f({ title: "D" })]);
    expect(r.opportunitySummary).toContain("4 issues");
    expect(r.opportunities).toHaveLength(4);
    expect(r.opportunities[0].rank).toBe(1);
    expect(r.actionPlan.now.length).toBe(3);
    expect(r.actionPlan.next.length).toBe(1);
    expect(r.llmFindings).toEqual([]);
  });

  it("handles a clean site with no findings", () => {
    const r = fallbackReport([]);
    expect(r.opportunities).toEqual([]);
    expect(r.opportunitySummary).toBeTruthy();
  });
});
