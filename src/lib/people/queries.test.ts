import { describe, expect, it } from "vitest";

import { normalizeEmail, planLabel } from "./types";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("planLabel", () => {
  it("active membership → Premium", () => {
    expect(planLabel({ userId: "u1", planKey: "premium-monthly", membershipStatus: "active" })).toBe("Premium");
  });
  it("verified account, no active membership → Free", () => {
    expect(planLabel({ userId: "u1", planKey: null, membershipStatus: null })).toBe("Free");
    expect(planLabel({ userId: "u1", planKey: "premium-monthly", membershipStatus: "cancelled" })).toBe("Free");
  });
  it("email-only lead (no account) → em dash", () => {
    expect(planLabel({ userId: null, planKey: null, membershipStatus: null })).toBe("—");
  });
});
