import { describe, it, expect } from "vitest";
import { parseTags, parseSortOrder, photoRowFromFormData } from "./form";

describe("parseTags", () => {
  it("splits, trims, and drops empty entries", () => {
    expect(parseTags("street,  portrait , ,travel,")).toEqual([
      "street",
      "portrait",
      "travel",
    ]);
  });

  it("removes duplicates, preserving first occurrence order", () => {
    expect(parseTags("a, b, a, c, b")).toEqual(["a", "b", "c"]);
  });

  it("returns [] for empty or non-string input", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags("   ")).toEqual([]);
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });
});

describe("parseSortOrder", () => {
  it("parses integers", () => {
    expect(parseSortOrder("5")).toBe(5);
    expect(parseSortOrder("-3")).toBe(-3);
  });

  it("truncates decimals", () => {
    expect(parseSortOrder("2.9")).toBe(2);
  });

  it("defaults to 0 for blank or invalid input", () => {
    expect(parseSortOrder("")).toBe(0);
    expect(parseSortOrder("abc")).toBe(0);
    expect(parseSortOrder(null)).toBe(0);
  });
});

describe("photoRowFromFormData", () => {
  function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  }

  it("maps a full form to a row", () => {
    const row = photoRowFromFormData(
      fd({
        storage_path: "1720000000-abc123.jpg",
        title: "Sunset",
        description: "  A warm dusk  ",
        tags: "sky, warm, sky",
        sort_order: "10",
        published: "on",
      }),
    );
    expect(row).toEqual({
      storage_path: "1720000000-abc123.jpg",
      title: "Sunset",
      description: "A warm dusk",
      tags: ["sky", "warm"],
      sort_order: 10,
      published: true,
    });
  });

  it("blank description becomes null and missing checkbox is false", () => {
    const row = photoRowFromFormData(
      fd({ storage_path: "x.jpg", title: "T", description: "   ", tags: "", sort_order: "" }),
    );
    expect(row.description).toBeNull();
    expect(row.published).toBe(false);
    expect(row.tags).toEqual([]);
    expect(row.sort_order).toBe(0);
  });
});
