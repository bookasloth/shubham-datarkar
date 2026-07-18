import { describe, it, expect } from "vitest";
import { isUnverifiedPastGrace, GRACE_MS } from "./verification-gate";

const now = new Date("2026-07-18T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

describe("isUnverifiedPastGrace", () => {
  it("false when the email is verified, regardless of age", () => {
    expect(
      isUnverifiedPastGrace({ email_confirmed_at: hoursAgo(1), created_at: hoursAgo(100) }, now),
    ).toBe(false);
  });

  it("false when unverified but inside the 48h window", () => {
    expect(isUnverifiedPastGrace({ email_confirmed_at: null, created_at: hoursAgo(47) }, now)).toBe(false);
  });

  it("true when unverified and older than 48h", () => {
    expect(isUnverifiedPastGrace({ email_confirmed_at: null, created_at: hoursAgo(49) }, now)).toBe(true);
  });

  it("false exactly at the boundary (48h is still allowed)", () => {
    expect(isUnverifiedPastGrace({ email_confirmed_at: null, created_at: hoursAgo(48) }, now)).toBe(false);
  });

  it("GRACE_MS is 48 hours", () => {
    expect(GRACE_MS).toBe(48 * 60 * 60 * 1000);
  });
});
