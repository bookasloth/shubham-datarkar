import { describe, expect, it } from "vitest";
import type { ContentBlock, Post } from "@/lib/data/types";
import { autolinkBlocks } from "./autolink";
import { buildExternalIndex } from "./external-links";

function post(over: Partial<Post>): Post {
  return {
    slug: "s",
    title: "T",
    excerpt: "",
    category: "build-in-public",
    tags: [],
    date: "2026-01-01",
    words: 0,
    featured: false,
    body: [],
    ...over,
  } as Post;
}

describe("buildExternalIndex", () => {
  it("falls back to venture homepages when no topic matches", () => {
    const idx = buildExternalIndex(post({ title: "A quiet weekend" }));
    expect(idx).toEqual([
      { term: "book a sloth", href: "https://bookasloth.com/" },
      { term: "timewheel", href: "https://timewheel.co.in/" },
    ]);
  });

  it("deep-links Book A Sloth from a topical tag", () => {
    const idx = buildExternalIndex(post({ tags: ["dentists", "booking"] }));
    expect(idx[0]).toEqual({ term: "book a sloth", href: "https://bookasloth.com/for/dentists" });
  });

  it("deep-links Timewheel from an SEO title", () => {
    const idx = buildExternalIndex(post({ title: "SEO for local shops" }));
    expect(idx[1]).toEqual({ term: "timewheel", href: "https://timewheel.co.in/seo-company-in-nagpur" });
  });
});

describe("external autolink pass", () => {
  it("inserts an outbound anchor for a brand mention in prose", () => {
    const idx = buildExternalIndex(post({ title: "shipping updates" }));
    const blocks: ContentBlock[] = [{ type: "p", text: "We built Book A Sloth from scratch." }];
    const [b] = autolinkBlocks(blocks, idx, 2) as [{ type: string; text: unknown }];
    expect(b.text).toEqual([
      "We built ",
      { t: "a", text: "Book A Sloth", href: "https://bookasloth.com/" },
      " from scratch.",
    ]);
  });
});
