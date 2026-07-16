import { describe, it, expect } from "vitest";
import {
  APP_NAV, activeSection, activeChildHref, sectionHref,
} from "@/components/app-shell/nav-config";

describe("APP_NAV", () => {
  it("has the four sections in order", () => {
    expect(APP_NAV.map((s) => s.key)).toEqual(["community", "membership", "game", "account"]);
  });
  it("marks member-only items gated", () => {
    const all = APP_NAV.flatMap((s) => s.items);
    const downloads = all.find((i) => i.href === "/members/downloads");
    expect(downloads?.gated).toBe(true);
    const explore = all.find((i) => i.href === "/community");
    expect(explore?.gated).toBeFalsy();
  });
});

describe("activeSection", () => {
  it("resolves each area by prefix", () => {
    expect(activeSection("/community")).toBe("community");
    expect(activeSection("/community/bookmarks")).toBe("community");
    expect(activeSection("/members")).toBe("membership");
    expect(activeSection("/members/explore")).toBe("membership");
    expect(activeSection("/games/alfazy")).toBe("game");
  });
  it("prefers the more specific /members/account over /members", () => {
    expect(activeSection("/members/account")).toBe("account");
  });
  it("returns null off-shell", () => {
    expect(activeSection("/")).toBeNull();
    expect(activeSection("/blog")).toBeNull();
  });
});

describe("activeChildHref", () => {
  it("picks the longest matching item", () => {
    expect(activeChildHref("/community")).toBe("/community");
    expect(activeChildHref("/community/bookmarks")).toBe("/community/bookmarks");
  });

  // A game's sub-links are leaf items, so standing on Archive must highlight
  // Archive — not the game's Play href, which ties on prefix but is shorter.
  it("highlights a game sub-link over the game's own href", () => {
    expect(activeChildHref("/games/alfazy/archive")).toBe("/games/alfazy/archive");
    expect(activeChildHref("/games/alfazy/leaderboard")).toBe("/games/alfazy/leaderboard");
    expect(activeChildHref("/games/alfazy")).toBe("/games/alfazy");
  });
  it("returns null off-shell", () => {
    expect(activeChildHref("/blog")).toBeNull();
  });
});

describe("sectionHref", () => {
  it("returns each section's first child", () => {
    expect(sectionHref("community")).toBe("/community");
    expect(sectionHref("membership")).toBe("/members/explore");
    expect(sectionHref("game")).toBe("/games/alfazy");
    expect(sectionHref("account")).toBe("/members/account");
  });
});
