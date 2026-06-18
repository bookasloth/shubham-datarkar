import { describe, it, expect } from "vitest";
import { pickAlias, thankyouAuthor, SUPPORTER_ALIASES } from "./aliases";

const ALIASES = SUPPORTER_ALIASES as readonly string[];

describe("pickAlias", () => {
  it("always returns a known alias", () => {
    for (let i = 0; i < 200; i++) {
      expect(ALIASES).toContain(pickAlias());
    }
  });
});

describe("thankyouAuthor", () => {
  it("uses the real name when present and not anonymous", () => {
    expect(thankyouAuthor({ name: "Aanya Rao", anonymous: false })).toEqual({ name: "Aanya Rao" });
  });

  it("trims the name", () => {
    expect(thankyouAuthor({ name: "  Aanya  ", anonymous: false })).toEqual({ name: "Aanya" });
  });

  it("falls back to an alias when anonymous", () => {
    const author = thankyouAuthor({ name: "Aanya", anonymous: true });
    expect("alias" in author && ALIASES.includes(author.alias)).toBe(true);
  });

  it("falls back to an alias when the name is missing or blank", () => {
    expect("alias" in thankyouAuthor({ name: null, anonymous: false })).toBe(true);
    expect("alias" in thankyouAuthor({ name: "   ", anonymous: false })).toBe(true);
  });
});
