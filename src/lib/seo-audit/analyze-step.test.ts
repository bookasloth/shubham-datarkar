import { describe, it, expect, beforeAll } from "vitest";
import { analyzeStep, type AuditRow, type AuditDeps } from "./job-server";
import { mkPage } from "./_fixtures";
import type { DetailedFetch } from "@/lib/tools/safe-fetch";
import type { AuditScores, Finding } from "./types";

// Force fixtures so the LLM calls cost nothing and are deterministic.
beforeAll(() => {
  process.env.KALAMAI_FAKE_LLM = "1";
});

const body = (url: string): DetailedFetch => ({
  finalUrl: url, status: 200, redirectHops: 0, contentType: "text/html", xRobotsTag: null,
  body: `<html><head><title>${url}</title></head><body><main><h1>${url}</h1><h2>What is it?</h2><p>${"content ".repeat(120)}</p></main></body></html>`,
});

const deps: AuditDeps = { fetchPage: async (u) => body(u), fetchText: async () => null };

const scores: AuditScores = { seo: 70, ai: 45, overall: 58, color: "orange", seoCategories: [], aiCategories: [] };
const findings: Finding[] = [{ id: "has-schema", title: "No structured data", problem: "p", why: "w", evidence: "e", affectedUrls: [], severity: "medium", category: "seo", recommendation: "r", source: "deterministic" }];

const row: AuditRow = {
  id: "a1", url: "https://x.com/", domain: "x.com", status: "analyzing", progress: 100, page_budget: 12, crawl_cursor: 3,
  urls: [
    { url: "https://x.com/", class: "home", priority: 0 },
    { url: "https://x.com/services/seo", class: "service", priority: 1 },
    { url: "https://x.com/blog/z", class: "article", priority: 4 },
  ],
  crawl_meta: null,
  pages: [mkPage({ url: "https://x.com/", class: "home" }), mkPage({ url: "https://x.com/services/seo", class: "service" }), mkPage({ url: "https://x.com/blog/z", class: "article" })],
  scores, findings, email: null, created_at: new Date().toISOString(),
};

describe("analyzeStep (fake LLM)", () => {
  it("produces the deep report, merges findings, scores the lead", async () => {
    const t = await analyzeStep(row, deps);
    expect(t.result.status).toBe("complete");
    const report = t.patch.report as { opportunities: unknown[]; llmFindings: unknown[] };
    expect(report.opportunities.length).toBeGreaterThan(0);
    const merged = t.patch.findings as Finding[];
    expect(merged.some((f) => f.source === "deterministic")).toBe(true);
    expect(merged.some((f) => f.source === "llm")).toBe(true);
    expect(typeof t.patch.lead_score).toBe("number");
    expect(["HOT", "WARM", "COLD"]).toContain(t.patch.lead_bucket);
  });

  it("does not run the LLM pass on more than the important-page budget", async () => {
    let fetches = 0;
    const counting: AuditDeps = { fetchPage: async (u) => { fetches++; return body(u); }, fetchText: async () => null };
    const many: AuditRow = {
      ...row,
      urls: Array.from({ length: 20 }, (_, i) => ({ url: `https://x.com/services/${i}`, class: "service" as const, priority: 1 })),
      pages: Array.from({ length: 20 }, (_, i) => mkPage({ url: `https://x.com/services/${i}`, class: "service" })),
    };
    await analyzeStep(many, counting);
    expect(fetches).toBeLessThanOrEqual(6);
  });
});
