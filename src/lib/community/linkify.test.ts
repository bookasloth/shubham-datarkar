import { describe, it, expect } from "vitest";
import { tokenizeLinks, prettyLabel, mentionedHandles } from "./linkify";

describe("tokenizeLinks", () => {
  it("passes through text with no URL as a single token", () => {
    expect(tokenizeLinks("just some words")).toEqual([{ type: "text", value: "just some words" }]);
  });

  it("tokenizes a #hashtag, lowercased, and leaves trailing punctuation as text", () => {
    expect(tokenizeLinks("love #SEO.")).toEqual([
      { type: "text", value: "love " },
      { type: "hashtag", tag: "seo", value: "#seo" },
      { type: "text", value: "." },
    ]);
  });

  it("handles a hashtag and a mention together", () => {
    const t = tokenizeLinks("#launch by @sam");
    expect(t[0]).toEqual({ type: "hashtag", tag: "launch", value: "#launch" });
    expect(t.some((x) => x.type === "mention" && x.handle === "sam")).toBe(true);
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

describe("tokenizeLinks — mentions", () => {
  it("splits a mention out of surrounding text", () => {
    expect(tokenizeLinks("hey @sam nice one")).toEqual([
      { type: "text", value: "hey " },
      { type: "mention", handle: "sam", value: "@sam" },
      { type: "text", value: " nice one" },
    ]);
  });

  it("matches a mention at the very start of the body", () => {
    expect(tokenizeLinks("@sam hi")[0]).toEqual({ type: "mention", handle: "sam", value: "@sam" });
  });

  it("keeps the whole auto-provisioned dotted handle", () => {
    // handle_new_user mints lower(email-local) || '_' || md5 — dots included.
    expect(tokenizeLinks("cc @shubham.datarkar_a1b2")[1]).toEqual({
      type: "mention",
      handle: "shubham.datarkar_a1b2",
      value: "@shubham.datarkar_a1b2",
    });
  });

  it("does not treat an email address as a mention", () => {
    expect(tokenizeLinks("mail me at foo@bar.com ok")).toEqual([
      { type: "text", value: "mail me at foo@bar.com ok" },
    ]);
  });

  it("does not find a mention inside a URL", () => {
    const t = tokenizeLinks("https://x.com/@sam");
    expect(t.filter((x) => x.type === "mention")).toHaveLength(0);
    expect(t[0]).toEqual({ type: "link", href: "https://x.com/@sam", text: "https://x.com/@sam" });
  });

  it("leaves trailing sentence punctuation out of the handle", () => {
    const t = tokenizeLinks("ping @sam.");
    expect(t[1]).toEqual({ type: "mention", handle: "sam", value: "@sam" });
    expect(t[2]).toEqual({ type: "text", value: "." });
  });

  it("lowercases the handle but renders the text as typed", () => {
    expect(tokenizeLinks("yo @Sam")[1]).toEqual({ type: "mention", handle: "sam", value: "@Sam" });
  });

  it("ignores a too-short handle", () => {
    expect(tokenizeLinks("a @ab b")).toEqual([{ type: "text", value: "a @ab b" }]);
  });

  it("handles a mention and a link in one body", () => {
    const t = tokenizeLinks("@sam see https://x.com/a");
    expect(t.map((x) => x.type)).toEqual(["mention", "text", "link"]);
  });
});

describe("mentionedHandles", () => {
  it("returns distinct lowercased handles", () => {
    expect(mentionedHandles("@sam and @Sam and @meera")).toEqual(["sam", "meera"]);
  });

  it("returns nothing for a body with no mentions", () => {
    expect(mentionedHandles("just words and foo@bar.com")).toEqual([]);
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
