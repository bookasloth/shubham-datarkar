import { describe, it, expect } from "vitest";

import {
  formatPhotoDate,
  computeHasMore,
  nextOffset,
  wrapIndex,
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

describe("wrapIndex", () => {
  it("returns the index unchanged when in range", () => {
    expect(wrapIndex(0, 5)).toBe(0);
    expect(wrapIndex(3, 5)).toBe(3);
    expect(wrapIndex(4, 5)).toBe(4);
  });

  it("wraps forward past the last index to the first", () => {
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(6, 5)).toBe(1);
  });

  it("wraps backward before zero to the last index", () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(-2, 5)).toBe(3);
    expect(wrapIndex(-6, 5)).toBe(4);
  });

  it("returns 0 for a non-positive count", () => {
    expect(wrapIndex(3, 0)).toBe(0);
    expect(wrapIndex(0, -1)).toBe(0);
  });

  it("handles a single-item list", () => {
    expect(wrapIndex(0, 1)).toBe(0);
    expect(wrapIndex(1, 1)).toBe(0);
    expect(wrapIndex(-1, 1)).toBe(0);
  });
});
