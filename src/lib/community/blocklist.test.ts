import { describe, it, expect } from "vitest";
import { containsBlocked } from "./blocklist";

describe("containsBlocked", () => {
  it("flags an explicit term", () => expect(containsBlocked("free porn here")).toBe(true));
  it("is case insensitive", () => expect(containsBlocked("FREE PORN")).toBe(true));
  it("tolerates punctuation", () => expect(containsBlocked("buy nudes!!!")).toBe(true));
  it("does not flag substrings of clean words", () => {
    expect(containsBlocked("I went to Scunthorpe")).toBe(false);
    expect(containsBlocked("classic analysis of the data")).toBe(false);
  });
  it("passes clean text", () => expect(containsBlocked("shipped a new feature today")).toBe(false));
  it("handles empty", () => expect(containsBlocked("")).toBe(false));
});
