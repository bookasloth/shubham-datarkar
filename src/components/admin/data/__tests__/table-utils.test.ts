import { describe, it, expect } from "vitest";
import { sortRows, paginate, filterRows } from "@/components/admin/data/table-utils";

type Row = { id: number; name: string | null; age: number };
const rows: Row[] = [
  { id: 1, name: "Charlie", age: 30 },
  { id: 2, name: "alice", age: 25 },
  { id: 3, name: null, age: 40 },
];

describe("sortRows", () => {
  it("sorts strings case-insensitively ascending, nullish last", () => {
    const out = sortRows(rows, (r) => r.name, "asc").map((r) => r.id);
    expect(out).toEqual([2, 1, 3]); // alice, Charlie, null
  });
  it("descending reverses non-null order, nullish still last", () => {
    const out = sortRows(rows, (r) => r.name, "desc").map((r) => r.id);
    expect(out).toEqual([1, 2, 3]); // Charlie, alice, null
  });
  it("sorts numbers", () => {
    expect(sortRows(rows, (r) => r.age, "asc").map((r) => r.age)).toEqual([25, 30, 40]);
  });
  it("does not mutate input", () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.age, "asc");
    expect(rows).toEqual(copy);
  });
});

describe("paginate", () => {
  it("slices a page", () => {
    const r = Array.from({ length: 23 }, (_, i) => i);
    const { pageRows, pageCount, page } = paginate(r, 2, 10);
    expect(pageRows).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(pageCount).toBe(3);
    expect(page).toBe(2);
  });
  it("clamps out-of-range page", () => {
    const r = [1, 2, 3];
    expect(paginate(r, 99, 10).page).toBe(1);
    expect(paginate(r, 0, 10).page).toBe(1);
  });
  it("empty rows → pageCount 1", () => {
    expect(paginate([], 1, 10)).toEqual({ pageRows: [], pageCount: 1, page: 1 });
  });
});

describe("filterRows", () => {
  it("case-insensitive substring", () => {
    expect(filterRows(rows, "ALI", (r) => r.name ?? "").map((r) => r.id)).toEqual([2]);
  });
  it("empty query returns all", () => {
    expect(filterRows(rows, "   ", (r) => r.name ?? "")).toHaveLength(3);
  });
});
