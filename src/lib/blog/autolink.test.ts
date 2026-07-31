import { describe, expect, it } from "vitest";
import type { ContentBlock, Post } from "@/lib/data/types";
import { autolinkBlocks, buildLinkIndex } from "./autolink";

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

const current = post({ slug: "current", tags: ["supabase"] });

describe("buildLinkIndex", () => {
  it("skips the current post and short tags", () => {
    const idx = buildLinkIndex(current, [
      post({ slug: "current", tags: ["supabase"] }), // self → skipped
      post({ slug: "a", category: "ai", tags: ["ai"] }), // < MIN_TERM_LEN → skipped
      post({ slug: "b", category: "content", tags: ["supabase"] }),
    ]);
    expect(idx).toEqual([{ term: "supabase", href: "/blog/content/b" }]);
  });

  it("picks the most-focused post (fewest tags) as canonical", () => {
    const idx = buildLinkIndex(current, [
      post({ slug: "broad", category: "ai", tags: ["supabase", "x", "y"] }),
      post({ slug: "focused", category: "content", tags: ["supabase"] }),
    ]);
    expect(idx[0]).toEqual({ term: "supabase", href: "/blog/content/focused" });
  });
});

describe("autolinkBlocks", () => {
  const index = [{ term: "supabase", href: "/blog/content/b" }];

  it("links the first whole-word mention in a paragraph", () => {
    const blocks: ContentBlock[] = [{ type: "p", text: "I use Supabase daily." }];
    const [b] = autolinkBlocks(blocks, index) as [{ type: string; text: unknown }];
    expect(b.text).toEqual(["I use ", { t: "a", text: "Supabase", href: "/blog/content/b" }, " daily."]);
  });

  it("does not link the same target twice and respects the cap", () => {
    const blocks: ContentBlock[] = [
      { type: "p", text: "supabase again supabase" },
      { type: "p", text: "supabase" },
    ];
    const out = autolinkBlocks(blocks, index) as { text: unknown }[];
    const links = JSON.stringify(out).match(/"t":"a"/g) ?? [];
    expect(links).toHaveLength(1);
  });

  it("leaves headings and non-matching prose untouched", () => {
    const blocks: ContentBlock[] = [
      { type: "h2", text: "supabase" }, // not a linkable type
      { type: "p", text: "nothing here" },
    ];
    expect(autolinkBlocks(blocks, index)).toEqual(blocks);
  });

  it("matches a hyphenated slug tag against its natural-language form", () => {
    const idx = [{ term: "book-a-sloth", href: "/blog/build-in-public/x" }];
    const blocks: ContentBlock[] = [{ type: "p", text: "Today on Book A Sloth I broke prod." }];
    const [b] = autolinkBlocks(blocks, idx) as [{ type: string; text: unknown }];
    expect(b.text).toEqual([
      "Today on ",
      { t: "a", text: "Book A Sloth", href: "/blog/build-in-public/x" },
      " I broke prod.",
    ]);
  });

  it("is a no-op with an empty index", () => {
    const blocks: ContentBlock[] = [{ type: "p", text: "supabase" }];
    expect(autolinkBlocks(blocks, [])).toBe(blocks);
  });
});
