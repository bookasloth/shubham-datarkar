import { describe, it, expect } from "vitest";
import { avatarColor, timeAgo } from "./utils";

describe("avatarColor", () => {
  it("is deterministic", () => expect(avatarColor("sloth")).toBe(avatarColor("sloth")));
  it("differs by seed", () => expect(avatarColor("a")).not.toBe(avatarColor("bbbb")));
  it("returns an hsl string", () => expect(avatarColor("x")).toMatch(/^hsl\(/));
});

describe("timeAgo", () => {
  it("just now → 'now'", () => expect(timeAgo(new Date())).toBe("now"));
  it("minutes / hours / days / weeks", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 5 * 60_000))).toBe("5m");
    expect(timeAgo(new Date(now - 3 * 3_600_000))).toBe("3h");
    expect(timeAgo(new Date(now - 2 * 86_400_000))).toBe("2d");
    expect(timeAgo(new Date(now - 3 * 7 * 86_400_000))).toBe("3w");
  });
});
