import { describe, it, expect } from "vitest";
import { normalizeProfileText } from "./profile-text";

describe("normalizeProfileText", () => {
  it("trims and empties blank strings to null", () => {
    expect(normalizeProfileText({ headline: "  ", bio: "" })).toEqual({ headline: null, bio: null });
  });
  it("keeps trimmed content", () => {
    expect(normalizeProfileText({ headline: "  Web Dev  ", bio: "Hi" })).toEqual({ headline: "Web Dev", bio: "Hi" });
  });
  it("caps headline at 120 chars and bio at 500", () => {
    const r = normalizeProfileText({ headline: "a".repeat(200), bio: "b".repeat(600) });
    expect(r.headline).toHaveLength(120);
    expect(r.bio).toHaveLength(500);
  });
  it("treats undefined as null", () => {
    expect(normalizeProfileText({})).toEqual({ headline: null, bio: null });
  });
});
