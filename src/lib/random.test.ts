import { describe, it, expect } from "vitest";
import { pickRandom } from "./random";

describe("pickRandom", () => {
  it("returns n distinct elements when arr.length >= n", () => {
    const out = pickRandom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    out.forEach((v) => expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).toContain(v));
  });

  it("returns the whole array when arr.length < n", () => {
    const arr = [1, 2, 3];
    const out = pickRandom(arr, 10);
    expect(out).toHaveLength(3);
    expect(new Set(out)).toEqual(new Set(arr));
  });

  it("does not mutate the input", () => {
    const arr = [1, 2, 3, 4, 5];
    const snap = [...arr];
    pickRandom(arr, 2);
    expect(arr).toEqual(snap);
  });
});
