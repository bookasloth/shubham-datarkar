import { describe, it, expect } from "vitest";
import { formatCountdown } from "./format-countdown";

describe("formatCountdown", () => {
  it("formats hours, minutes, seconds zero-padded", () => {
    expect(formatCountdown(3661_000)).toBe("01:01:01");
  });
  it("formats a full day boundary under 24h", () => {
    expect(formatCountdown((23 * 3600 + 59 * 60 + 59) * 1000)).toBe("23:59:59");
  });
  it("clamps negative values to zero", () => {
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
  it("floors partial seconds", () => {
    expect(formatCountdown(1999)).toBe("00:00:01");
  });
});
