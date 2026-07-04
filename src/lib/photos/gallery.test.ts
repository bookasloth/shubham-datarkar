import { describe, it, expect } from "vitest";

import {
  formatPhotoDate,
  computeHasMore,
  nextOffset,
  matchesTag,
  filterByTag,
} from "./gallery";

describe("formatPhotoDate", () => {
  it("formats an ISO timestamp as 'Month YYYY'", () => {
    expect(formatPhotoDate("2026-07-01T00:00:00.000Z")).toBe("July 2026");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(formatPhotoDate(null)).toBe("");
    expect(formatPhotoDate(undefined)).toBe("");
    expect(formatPhotoDate("")).toBe("");
  });

  it("returns empty string for an unparseable date", () => {
    expect(formatPhotoDate("not-a-date")).toBe("");
  });
});

describe("computeHasMore", () => {
  it("is true when the batch fills the requested limit", () => {
    expect(computeHasMore(12, 12, 12)).toBe(true);
  });

  it("is false when the batch is short (end reached)", () => {
    expect(computeHasMore(20, 8, 12)).toBe(false);
  });

  it("is false on an empty batch", () => {
    expect(computeHasMore(12, 0, 12)).toBe(false);
  });

  it("is false for a non-positive limit", () => {
    expect(computeHasMore(0, 0, 0)).toBe(false);
    expect(computeHasMore(5, 5, -1)).toBe(false);
  });

  it("guards against negative counts", () => {
    expect(computeHasMore(-1, 12, 12)).toBe(false);
    expect(computeHasMore(12, -1, 12)).toBe(false);
  });
});

describe("nextOffset", () => {
  it("returns the loaded count as the next offset", () => {
    expect(nextOffset(0)).toBe(0);
    expect(nextOffset(12)).toBe(12);
    expect(nextOffset(24)).toBe(24);
  });

  it("clamps negatives to 0", () => {
    expect(nextOffset(-5)).toBe(0);
  });
});

describe("matchesTag", () => {
  it("matches everything when active tag is null/empty", () => {
    expect(matchesTag({ tags: ["a"] }, null)).toBe(true);
    expect(matchesTag({ tags: [] }, "")).toBe(true);
  });

  it("matches only when the tag is present", () => {
    expect(matchesTag({ tags: ["nature", "sunset"] }, "sunset")).toBe(true);
    expect(matchesTag({ tags: ["nature"] }, "sunset")).toBe(false);
  });

  it("handles missing/undefined tags safely", () => {
    expect(matchesTag({ tags: undefined as unknown as string[] }, "sunset")).toBe(false);
  });
});

describe("filterByTag", () => {
  const photos = [
    { id: "1", tags: ["nature"] },
    { id: "2", tags: ["city", "nature"] },
    { id: "3", tags: ["city"] },
  ];

  it("returns all when no active tag", () => {
    expect(filterByTag(photos, null)).toHaveLength(3);
  });

  it("filters to photos carrying the tag", () => {
    const result = filterByTag(photos, "nature");
    expect(result.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterByTag(photos, "space")).toEqual([]);
  });
});
