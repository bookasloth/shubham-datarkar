import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./fetch-html";

describe("mapWithConcurrency", () => {
  it("preserves input order in the results", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 6, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(6);
  });

  it("handles an empty input", async () => {
    expect(await mapWithConcurrency([], 6, async () => 1)).toEqual([]);
  });

  it("handles fewer items than the limit", async () => {
    expect(await mapWithConcurrency([1], 6, async (n) => n + 1)).toEqual([2]);
  });
});
