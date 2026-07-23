import { describe, it, expect } from "vitest";
import { parseStartingPrice } from "./seo";

describe("parseStartingPrice", () => {
  it("parses plain rupee amounts with commas", () => {
    expect(parseStartingPrice("₹6,999 / month")).toBe(6999);
    expect(parseStartingPrice("₹14,999 / month")).toBe(14999);
  });
  it("expands K and L suffixes", () => {
    expect(parseStartingPrice("₹75K / month")).toBe(75000);
    expect(parseStartingPrice("₹1.5L / month")).toBe(150000);
    expect(parseStartingPrice("₹2 lakh")).toBe(200000);
  });
  it("returns null when there is no number", () => {
    expect(parseStartingPrice("On request")).toBeNull();
  });
});
