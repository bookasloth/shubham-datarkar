import { describe, it, expect } from "vitest";
import { getInitials, avatarColor, timeAgo, parseYouTubeId } from "./utils";

describe("getInitials", () => {
  it("takes first letters of two words", () => expect(getInitials("Shubham Datarkar")).toBe("SD"));
  it("single word → one letter", () => expect(getInitials("alfazy")).toBe("A"));
  it("collapses extra whitespace", () => expect(getInitials("  Ada   Lovelace ")).toBe("AL"));
  it("handles empty", () => expect(getInitials("")).toBe("?"));
});

describe("avatarColor", () => {
  it("is deterministic", () => expect(avatarColor("sloth")).toBe(avatarColor("sloth")));
  it("differs by seed", () => expect(avatarColor("a")).not.toBe(avatarColor("bbbb")));
  it("returns an hsl string", () => expect(avatarColor("x")).toMatch(/^hsl\(/));
});

describe("timeAgo", () => {
  it("just now → 'now'", () => expect(timeAgo(new Date())).toBe("now"));
  it("minutes / hours / days", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 5 * 60_000))).toBe("5m");
    expect(timeAgo(new Date(now - 3 * 3_600_000))).toBe("3h");
    expect(timeAgo(new Date(now - 2 * 86_400_000))).toBe("2d");
    expect(timeAgo(new Date(now - 3 * 7 * 86_400_000))).toBe("3w");
  });
});

describe("parseYouTubeId", () => {
  it("watch url", () => expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ"));
  it("short url", () => expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ"));
  it("rejects non-youtube", () => expect(parseYouTubeId("https://example.com")).toBeNull());
  it("rejects malformed", () => expect(parseYouTubeId("not a url")).toBeNull());
});
