import { describe, it, expect } from "vitest";
import { runFullAudit, auditSinglePage } from "./audit";

describe("runFullAudit", () => {
  it("returns pages array and summary", async () => {
    const result = await runFullAudit();
    expect(Array.isArray(result.pages)).toBe(true);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.summary.totalPages).toBeGreaterThan(0);
  });

  it("summary counts are consistent", async () => {
    const result = await runFullAudit();
    const { summary } = result;
    expect(summary.indexedPages + summary.notIndexedPages).toBe(summary.totalPages);
  });

  it("summary has color distribution", async () => {
    const result = await runFullAudit();
    const total = Object.values(result.summary.colorDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(result.summary.totalPages);
  });
});

describe("auditSinglePage", () => {
  it("returns audit entry for known route", async () => {
    const entry = await auditSinglePage("/about");
    expect(entry).not.toBeNull();
    expect(entry!.entry.route).toBe("/about");
    expect(entry!.scores.seo.score).toBeGreaterThanOrEqual(0);
  });

  it("returns null for unknown route", async () => {
    const entry = await auditSinglePage("/nonexistent-xyz-123");
    expect(entry).toBeNull();
  });
});
