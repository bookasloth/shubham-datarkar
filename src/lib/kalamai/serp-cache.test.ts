import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { weekBucket, monthBucket, serpCacheKey } from "./serp-cache";

describe("weekBucket (ISO-8601, UTC)", () => {
  it("formats as YYYY-Www", () => {
    expect(weekBucket(new Date("2026-07-18T00:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });

  // Year-boundary cases are where the algorithm earns its keep.
  it("2026-01-01 (Thu) is ISO week 1 of 2026", () => {
    expect(weekBucket(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
  });
  it("2021-01-01 (Fri) belongs to ISO week 53 of 2020", () => {
    expect(weekBucket(new Date("2021-01-01T00:00:00Z"))).toBe("2020-W53");
  });
  it("2024-12-30 (Mon) belongs to ISO week 1 of 2025", () => {
    expect(weekBucket(new Date("2024-12-30T00:00:00Z"))).toBe("2025-W01");
  });

  it("same week → same bucket, next week → different", () => {
    const a = weekBucket(new Date("2026-07-13T00:00:00Z")); // Mon
    const b = weekBucket(new Date("2026-07-19T00:00:00Z")); // Sun same week
    const c = weekBucket(new Date("2026-07-20T00:00:00Z")); // next Mon
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("monthBucket / serpCacheKey", () => {
  it("monthBucket is YYYY-MM (UTC)", () => {
    expect(monthBucket(new Date("2026-07-18T00:00:00Z"))).toBe("2026-07");
  });
  it("cache key normalizes keyword (trim + lowercase)", () => {
    expect(serpCacheKey("  Digital Marketing  ", "en", "IN", "2026-W29")).toBe(
      "digital marketing|en|IN|2026-W29",
    );
  });
});
