import { describe, it, expect } from "vitest";
import { generateTempPassword, TEMP_PASSWORD_CHARSET } from "./temp-password";

describe("generateTempPassword", () => {
  it("respects the requested length", () => {
    expect(generateTempPassword(14)).toHaveLength(14);
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it("stays within the unambiguous charset", () => {
    for (const c of generateTempPassword(500)) {
      expect(TEMP_PASSWORD_CHARSET).toContain(c);
    }
  });

  it("is random across calls", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTempPassword()));
    expect(set.size).toBe(50);
  });
});
