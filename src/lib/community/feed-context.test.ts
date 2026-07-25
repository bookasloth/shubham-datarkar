import { describe, it, expect } from "vitest";
import { feedContextLine } from "./feed-context";

describe("feedContextLine", () => {
  it("logged out is the random-preview line regardless of sort", () => {
    expect(feedContextLine({ sort: "new" }, false)).toBe(
      "A few notes at random. Sign in to read the whole feed.",
    );
  });
  it("following overrides sort", () => {
    expect(feedContextLine({ sort: "new", following: true }, true)).toBe(
      "Only the people you follow.",
    );
  });
  it("tag overrides sort", () => {
    expect(feedContextLine({ sort: "hot", tag: "seo" }, true)).toBe("Notes tagged #seo.");
  });
  it("new is the unranked line", () => {
    expect(feedContextLine({ sort: "new" }, true)).toBe(
      "Latest notes, newest first. Nothing is ranked or hidden.",
    );
  });
  it("hot is the one-time shuffle line", () => {
    expect(feedContextLine({ sort: "hot" }, true)).toBe(
      "A one-time shuffle. Refresh for a new order — no profile of you involved.",
    );
  });
  it("top names the window", () => {
    expect(feedContextLine({ sort: "top", window: "week" }, true)).toBe(
      "The most-liked notes this week.",
    );
    expect(feedContextLine({ sort: "top", window: "all" }, true)).toBe(
      "The most-liked notes of all time.",
    );
  });
  it("defaults missing sort to new", () => {
    expect(feedContextLine({}, true)).toBe(
      "Latest notes, newest first. Nothing is ranked or hidden.",
    );
  });
});
