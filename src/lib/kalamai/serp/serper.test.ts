import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseSerper } from "./serper";

const FIXTURE = {
  organic: [
    { title: "Best SEO Company", link: "https://a.example/seo", position: 2 },
    { title: "Digital Marketing Nagpur", link: "https://b.example/dm", position: 1 },
    { title: "no link here" }, // dropped — no link
    { link: "https://c.example/x", position: 3 }, // no title → null
  ],
  peopleAlsoAsk: [
    { question: "What is SEO?", snippet: "..." },
    { snippet: "no question" }, // dropped
    { question: "How much does it cost?" },
  ],
  relatedSearches: [{ query: "seo pricing" }],
};

describe("parseSerper", () => {
  it("maps organic (link→url, position→rank), sorts by rank, extracts paa", () => {
    const r = parseSerper(FIXTURE);
    expect(r.organic.map((o) => o.url)).toEqual([
      "https://b.example/dm", // position 1 first
      "https://a.example/seo",
      "https://c.example/x",
    ]);
    expect(r.organic[0].rank).toBe(1);
    expect(r.organic.find((o) => o.url === "https://c.example/x")!.title).toBeNull();
    expect(r.paa).toEqual(["What is SEO?", "How much does it cost?"]);
  });

  it("always returns empty aiOverviewUrls (Serper has none)", () => {
    expect(parseSerper(FIXTURE).aiOverviewUrls).toEqual([]);
  });

  it("tolerates an empty/garbage response without throwing", () => {
    expect(parseSerper({})).toEqual({ organic: [], paa: [], aiOverviewUrls: [] });
    expect(parseSerper(null)).toEqual({ organic: [], paa: [], aiOverviewUrls: [] });
  });
});
