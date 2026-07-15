import { describe, it, expect } from "vitest";
import { buildConfirmUrl } from "./confirm-url";

describe("buildConfirmUrl", () => {
  it("builds a confirm URL with token_hash + type", () => {
    const u = buildConfirmUrl("https://x.com", "abc", "recovery");
    expect(u).toBe("https://x.com/auth/confirm?token_hash=abc&type=recovery");
  });
  it("appends an encoded next", () => {
    const u = buildConfirmUrl("https://x.com", "abc", "recovery", "/reset-password");
    expect(u).toContain("next=%2Freset-password");
  });
});
