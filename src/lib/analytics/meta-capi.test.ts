import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { _test } from "./meta-capi";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("meta-capi PII hashing", () => {
  it("lowercases + trims email before hashing (never sends raw)", () => {
    const out = _test.hash("  Shubham@Example.COM ");
    expect(out).toBe(sha("shubham@example.com"));
    expect(out).not.toContain("@"); // raw PII must never survive
  });

  it("strips non-digits from phone, keeps country code, then hashes", () => {
    expect(_test.hashPhone("+91 (987) 654-3210")).toBe(sha("919876543210"));
  });

  it("returns undefined for empty / missing values", () => {
    expect(_test.hash(null)).toBeUndefined();
    expect(_test.hash("   ")).toBeUndefined();
    expect(_test.hashPhone("")).toBeUndefined();
    expect(_test.hashPhone("abc")).toBeUndefined();
  });
});
