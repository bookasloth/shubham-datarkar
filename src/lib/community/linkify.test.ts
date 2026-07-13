import { describe, it, expect } from "vitest";
import { tokenizeLinks, prettyLabel } from "./linkify";

describe("tokenizeLinks", () => {
  it("passes through text with no URL as a single token", () => {
    expect(tokenizeLinks("just some words")).toEqual([{ type: "text", value: "just some words" }]);
  });

  it("splits a URL out of surrounding text", () => {
    expect(tokenizeLinks("read https://x.com/a now")).toEqual([
      { type: "text", value: "read " },
      { type: "link", href: "https://x.com/a", text: "https://x.com/a" },
      { type: "text", value: " now" },
    ]);
  });

  it("keeps trailing sentence punctuation out of the href", () => {
    const t = tokenizeLinks("see https://x.com/a.");
    expect(t[1]).toEqual({ type: "link", href: "https://x.com/a", text: "https://x.com/a" });
    expect(t[2]).toEqual({ type: "text", value: "." });
  });

  it("linkifies two URLs in one string", () => {
    const links = tokenizeLinks("https://a.com and https://b.com").filter((x) => x.type === "link");
    expect(links).toHaveLength(2);
  });

  it("ignores a bare domain with no scheme", () => {
    expect(tokenizeLinks("visit example.com today")).toEqual([
      { type: "text", value: "visit example.com today" },
    ]);
  });
});

describe("prettyLabel", () => {
  it("drops scheme and www", () => {
    expect(prettyLabel("https://www.example.com/x")).toBe("example.com/x");
    expect(prettyLabel("http://example.com")).toBe("example.com");
  });

  it("keeps a short URL intact", () => {
    expect(prettyLabel("https://x.com/a")).toBe("x.com/a");
  });

  it("truncates a long URL with an ellipsis", () => {
    const long =
      "https://shubhamdatarkar.com/blog/updates/i-fixed-the-error-then-deleted-the-feature";
    const out = prettyLabel(long);
    expect(out.length).toBe(42);
    expect(out.endsWith("…")).toBe(true);
    expect(out.startsWith("shubhamdatarkar.com/blog")).toBe(true);
  });
});
