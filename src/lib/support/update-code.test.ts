import { describe, it, expect } from "vitest";
import { generateCode } from "./update-code";

describe("generateCode", () => {
  it("always returns a 6-digit string", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });
});
