import { describe, it, expect } from "vitest";
import { parseAlfazyWordForm, validateAlfazyWord } from "./alfazy-word-form";

describe("validateAlfazyWord", () => {
  it("accepts a clean 5-letter lowercase word", () => {
    expect(validateAlfazyWord("crane")).toEqual({ ok: true, word: "crane" });
  });
  it("lowercases and trims before validating", () => {
    expect(validateAlfazyWord("  CRANE ")).toEqual({ ok: true, word: "crane" });
  });
  it("rejects wrong length", () => {
    expect(validateAlfazyWord("cat").ok).toBe(false);
    expect(validateAlfazyWord("cranes").ok).toBe(false);
  });
  it("rejects non-letters", () => {
    expect(validateAlfazyWord("cr4ne").ok).toBe(false);
    expect(validateAlfazyWord("cr ne").ok).toBe(false);
  });
});

describe("parseAlfazyWordForm", () => {
  function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  }
  it("parses puzzle number and normalized word", () => {
    expect(parseAlfazyWordForm(fd({ puzzle_number: "42", word: " CRANE " }))).toEqual({
      puzzleNumber: 42,
      word: "crane",
    });
  });
});
