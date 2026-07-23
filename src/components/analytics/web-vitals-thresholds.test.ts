import { describe, it, expect } from "vitest";
import { isGood, formatVital, GOOD_THRESHOLDS } from "./web-vitals-thresholds";

describe("web-vitals-thresholds", () => {
  it("passes a value exactly on the 'good' boundary, fails just over", () => {
    expect(isGood("LCP", 2500)).toBe(true);
    expect(isGood("LCP", 2501)).toBe(false);
    expect(isGood("CLS", 0.1)).toBe(true);
    expect(isGood("CLS", 0.11)).toBe(false);
    expect(isGood("INP", 200)).toBe(true);
    expect(isGood("INP", 201)).toBe(false);
  });

  it("thresholds match Google's 'good' cutoffs", () => {
    expect(GOOD_THRESHOLDS).toEqual({ LCP: 2500, CLS: 0.1, INP: 200 });
  });

  it("formats LCP as seconds, INP as ms, CLS as a bare decimal", () => {
    expect(formatVital("LCP", 820)).toBe("0.82s");
    expect(formatVital("INP", 119.6)).toBe("120ms");
    expect(formatVital("CLS", 0.012)).toBe("0.012");
    expect(formatVital("CLS", 0)).toBe("0");
  });
});
