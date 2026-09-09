import { describe, it, expect } from "vitest";
import { rankSimilarBooks, matchBookQuery } from "./public-queries-helpers";

const mk = (o: Partial<{ id: string; title: string; author: string; isbn: string; genres: {id:string;name:string;slug:string}[]; moods: string[] }>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- brief's exact test fixture shape
  ({ id: o.id ?? "x", title: o.title ?? "T", author: o.author ?? "A", isbn: o.isbn ?? "", moods: o.moods ?? [], genres: o.genres ?? [] } as any);

describe("rankSimilarBooks", () => {
  const target = mk({ id: "t", author: "Housel", genres: [{id:"g1",name:"Finance",slug:"finance"}] });
  const pool = [
    mk({ id: "t", author: "Housel", genres:[{id:"g1",name:"Finance",slug:"finance"}] }), // self, excluded
    mk({ id: "a", author: "Housel", genres:[{id:"g2",name:"Biz",slug:"biz"}] }),          // author match
    mk({ id: "b", author: "X", genres:[{id:"g1",name:"Finance",slug:"finance"}] }),        // genre match
    mk({ id: "c", author: "Y", genres:[{id:"g9",name:"Sci",slug:"sci"}] }),                // no overlap
  ];
  const out = rankSimilarBooks(target, pool, 10);
  it("excludes self", () => { expect(out.find(b => b.id === "t")).toBeUndefined(); });
  it("ranks overlaps above non-overlaps", () => {
    const ids = out.map(b => b.id);
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("c"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("c"));
  });
});

describe("matchBookQuery", () => {
  const b = mk({ title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", genres:[{id:"g",name:"Self-Help",slug:"self-help"}], moods:["Practical"] });
  it("matches title case-insensitively", () => { expect(matchBookQuery(b, "atomic")).toBe(true); });
  it("matches author", () => { expect(matchBookQuery(b, "clear")).toBe(true); });
  it("matches isbn", () => { expect(matchBookQuery(b, "9780735211292")).toBe(true); });
  it("matches genre + mood", () => { expect(matchBookQuery(b, "self-help")).toBe(true); expect(matchBookQuery(b, "practical")).toBe(true); });
  it("no false match", () => { expect(matchBookQuery(b, "zzz")).toBe(false); });
});
