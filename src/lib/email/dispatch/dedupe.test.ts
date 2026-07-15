import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { istParts } from "./dedupe";

describe("istParts", () => {
  it("shifts UTC to IST civil date", () => {
    // 2026-11-07 20:00 UTC = 2026-11-08 01:30 IST
    const p = istParts(new Date("2026-11-07T20:00:00Z"));
    expect(p.date).toBe("2026-11-08");
    expect(p.dom).toBe(8);
    expect(p.ym).toBe("2026-11");
    expect(p.monthLabel).toBe("November");
  });
  it("late-UTC crosses into next IST day", () => {
    const p = istParts(new Date("2026-11-07T19:30:00Z")); // 01:00 IST 8th
    expect(p.date).toBe("2026-11-08");
  });
});
