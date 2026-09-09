import { describe, it, expect } from "vitest";
import { projectAudit, type AuditRowView } from "./view";
import type { Finding } from "./types";

const findings: Finding[] = Array.from({ length: 8 }, (_, i) => ({
  id: `f${i}`, title: `Finding ${i}`, problem: "p", why: "w", evidence: "e", affectedUrls: [], severity: "high", category: "seo", recommendation: "r", source: "deterministic",
}));

const row = (over: Partial<AuditRowView>): AuditRowView => ({
  id: "a1", url: "https://x.com/", domain: "x.com", status: "ready", progress: 100, report_status: "free",
  page_count: 5, scores: { seo: 70, ai: 40, overall: 55, color: "orange", seoCategories: [], aiCategories: [] }, findings, report: null, ...over,
});

describe("projectAudit gating", () => {
  it("free tier: both scores, top 3 findings, no LLM report", () => {
    const v = projectAudit(row({}));
    expect(v.scores?.seo).toBe(70);
    expect(v.scores?.ai).toBe(40); // AI score shown even on free tier
    expect(v.findings).toHaveLength(3);
    expect(v.findingsTotal).toBe(8);
    expect(v.report).toBeNull();
  });

  it("unlocked tier: all findings + report", () => {
    const v = projectAudit(row({ report_status: "unlocked", report: { opportunitySummary: "s", opportunities: [], topicMap: [], actionPlan: { now: [], next: [], later: [] }, llmFindings: [] } }));
    expect(v.findings).toHaveLength(8);
    expect(v.report).not.toBeNull();
  });
});
