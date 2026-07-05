import { describe, it, expect } from "vitest";
import { weekBoundsIST, monthBoundsIST } from "./periods";

// 2026-07-04 is a Saturday (IST). Pick a fixed UTC instant well inside that IST day.
const SAT_2026_07_04 = Date.UTC(2026, 6, 4, 6, 0, 0); // 11:30 IST

describe("weekBoundsIST", () => {
  it("returns Monday..Sunday for the IST week containing the date", () => {
    expect(weekBoundsIST(SAT_2026_07_04)).toEqual({ start: "2026-06-29", end: "2026-07-05" });
  });
});

describe("monthBoundsIST", () => {
  it("returns first..last day of the IST month", () => {
    expect(monthBoundsIST(SAT_2026_07_04)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });
});
