import { describe, it, expect } from "vitest";
import { activeToken } from "./use-mention-autocomplete";

// The parser decides when the @mention dropdown is live. Its two jobs: fire on a
// real @handle at the caret, and NOT fire on an email's @ (mid-word). Mirrors the
// server-side MENTION_RE contract in linkify.ts.
describe("activeToken", () => {
  const at = (s: string, caret = s.length) => activeToken(s, caret);

  it("activates on an @ at string start", () => {
    expect(at("@sam")).toEqual({ query: "sam", start: 0, end: 4 });
  });

  it("activates on an @ after whitespace", () => {
    expect(at("hi @sam")).toEqual({ query: "sam", start: 3, end: 7 });
  });

  it("returns an empty query right after a lone @", () => {
    expect(at("@")).toEqual({ query: "", start: 0, end: 1 });
  });

  it("keeps dots — real handles contain them", () => {
    expect(at("@shubham.datarkar")?.query).toBe("shubham.datarkar");
  });

  it("does NOT activate on an email's @ (mid-word)", () => {
    expect(at("mail me at foo@bar")).toBeNull();
  });

  it("stops at the whitespace before the caret", () => {
    // caret is after "sam " — no active @token on this word
    expect(at("@sam and", 8)).toBeNull();
  });

  it("reads the token the caret sits in, not a later one", () => {
    const v = "@one @two";
    // caret inside "@one"
    expect(at(v, 4)).toEqual({ query: "one", start: 0, end: 4 });
    // caret at end, inside "@two"
    expect(at(v, 9)).toEqual({ query: "two", start: 5, end: 9 });
  });

  it("rejects an over-long run", () => {
    expect(at("@" + "a".repeat(65))).toBeNull();
  });
});
