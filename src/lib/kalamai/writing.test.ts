import { describe, it, expect } from "vitest";
import {
  extractSourceFacts, buildCritiquePrompt, enforceWordCap, buildArticleMeta, FAKE_OUTLINE,
  buildSectionDraftPrompt, buildSectionRewritePrompt, buildCachePrefix, FAKE_SECTION_DRAFT,
  bandFor, CONTENT_TYPES, CONTENT_LABELS, buildOutlinePrompt,
} from "./writing";
import { FAKE_BRIEF } from "./brief";
import type { ContentBlock } from "@/lib/data/types";

const PARAMS = { targetWords: 1600, tone: "professional", audience: "marketers" };
const U = "https://src.example/a";

describe("extractSourceFacts", () => {
  it("keeps numeric fact-sentences with their source url, drops boilerplate and non-numeric prose", () => {
    const pages = [
      { rank: 2, url: "https://b.example", bodyText: "AI Overviews now appear on 47% of informational searches. Subscribe to our newsletter for more." },
      { rank: 1, url: "https://a.example", bodyText: "This is a generic sentence with no numbers at all. Perplexity handled 250 million queries in 2024." },
    ];
    const facts = extractSourceFacts(pages);
    expect(facts.some((f) => f.text.includes("47%") && f.url === "https://b.example")).toBe(true);
    // rank-ordered: rank 1's fact comes first, carrying rank 1's url
    expect(facts[0].text).toContain("Perplexity");
    expect(facts[0].url).toBe("https://a.example");
    expect(facts.some((f) => /subscribe/i.test(f.text))).toBe(false);
    expect(facts.some((f) => f.text.includes("generic sentence"))).toBe(false);
  });

  it("dedupes and caps", () => {
    const dup = "A study found 30% of buyers start on ChatGPT now instead of Google search.";
    expect(extractSourceFacts([{ rank: 1, url: U, bodyText: [dup, dup, dup].join(" ") }])).toHaveLength(1);
    const many = Array.from({ length: 40 }, (_, i) => `Fact number ${i} covers ${i * 3} percent of cases here.`).join(" ");
    expect(extractSourceFacts([{ rank: 1, url: U, bodyText: many }], 18)).toHaveLength(18);
  });

  it("empty facts → no facts section; facts → source url appears for backlinking", () => {
    const plan = { title: "t", description: "d", ogTitle: "og", ogDescription: "ogd", sections: [{ heading: "H", points: [], words: 400 }] };
    const draft = buildSectionDraftPrompt(FAKE_BRIEF, PARAMS, plan, 0, [], []);
    expect(draft.user).not.toContain("Source facts");
    const withFacts = buildSectionDraftPrompt(FAKE_BRIEF, PARAMS, plan, 0, [], [{ text: "AEO lifts citations by 20% in tests.", url: U }]);
    expect(withFacts.user).toContain("Source facts");
    expect(withFacts.user).toContain("20%");
    expect(withFacts.user).toContain(U);
    expect(draft.system).toMatch(/BACKLINK/);
  });

  it("critique flags unsourced stats + word band", () => {
    const c = buildCritiquePrompt(FAKE_BRIEF, PARAMS, [{ type: "p", text: "draft" }], [{ text: "Perplexity handled 250 million queries in 2024.", url: U }]);
    expect(c.system).toMatch(/not supported by the source facts/i);
    expect(c.system).toMatch(/1000-2200 words/);
    expect(c.user).toContain("250 million");

  });
});

describe("enforceWordCap", () => {
  it("trims over-length body but preserves a trailing faq, and leaves short articles untouched", () => {
    const long = (n: number): ContentBlock => ({ type: "p", text: Array.from({ length: n }, () => "word").join(" ") });
    const faq: ContentBlock = { type: "faq", items: [{ q: "q?", a: "a" }] };
    const blocks: ContentBlock[] = [long(1500), long(1500), faq];
    const capped = enforceWordCap(blocks, 2200);
    // second 1500-word body block dropped, faq kept
    expect(capped.some((b) => b.type === "faq")).toBe(true);
    expect(capped.filter((b) => b.type === "p").length).toBe(1);
    // already-short article is returned unchanged
    const short: ContentBlock[] = [long(50), faq];
    expect(enforceWordCap(short, 2200)).toEqual(short);
  });
});

describe("buildArticleMeta — OG fields", () => {
  const brief = { metaTitles: ["Meta T"], metaDescriptions: ["Meta D"], schemaJsonLd: "{}" } as unknown as import("./brief").Brief;

  it("uses the plan's social-optimized OG title/description when present", () => {
    const plan = { ...FAKE_OUTLINE, ogTitle: "Punchy OG", ogDescription: "Shareable OG blurb" };
    const meta = buildArticleMeta(brief, plan);
    expect(meta.ogTitle).toBe("Punchy OG");
    expect(meta.ogDescription).toBe("Shareable OG blurb");
  });

  it("falls back to meta title/description when the model omits OG", () => {
    const plan = { ...FAKE_OUTLINE, ogTitle: "", ogDescription: "" };
    const meta = buildArticleMeta(brief, plan);
    expect(meta.ogTitle).toBe(meta.title);
    expect(meta.ogDescription).toBe(meta.description);
  });
});

const briefStub = {
  metaTitles: ["T"], metaDescriptions: ["D"], schemaJsonLd: "{}",
  outline: [{ h2: "H", h3: [] }],
  termClusters: [{ label: "c", terms: ["seo", "ppc"] }],
  questions: ["What is X?"],
} as unknown as import("./brief").Brief;
const paramsStub = { targetWords: 1500, tone: "professional", audience: "smb owners" };

describe("buildSectionDraftPrompt", () => {
  it("section 0 asks for an opening lead", () => {
    const { system } = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 0, []);
    expect(system.toLowerCase()).toContain("lead");
  });
  it("the final section asks for a closing faq", () => {
    const last = FAKE_OUTLINE.sections.length - 1;
    const { system } = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, last, ["a", "b"]);
    expect(system.toLowerCase()).toContain("faq");
  });
  it("a middle section asks for neither lead nor faq and lists prior headings", () => {
    const { system, user } = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 1, ["Prior One"]);
    expect(system.toLowerCase()).not.toContain("lead block");
    expect(system.toLowerCase()).not.toContain("faq");
    expect(user).toContain("Prior One");
    expect(user).toContain(FAKE_OUTLINE.sections[1].heading);
  });
  it("cache prefix is stable across section indexes", () => {
    const p0 = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 0, []).cachePrefix;
    const p2 = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 2, ["a", "b"]).cachePrefix;
    expect(p0).toBe(buildCachePrefix(briefStub, paramsStub));
    expect(p2).toBe(p0);
  });
});

describe("buildSectionRewritePrompt", () => {
  it("includes the critique points and the target section heading", () => {
    const critique = { missingTerms: ["schema"], missingSections: [], issues: ["too generic"], ok: false };
    const { user } = buildSectionRewritePrompt(briefStub, paramsStub, [{ type: "p", text: "x" }], critique, "My Section", []);
    expect(user).toContain("schema");
    expect(user).toContain("too generic");
    expect(user).toContain("My Section");
  });
});

describe("FAKE_SECTION_DRAFT", () => {
  it("parses to a small non-empty ContentBlock array", () => {
    const arr = JSON.parse(FAKE_SECTION_DRAFT);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBeGreaterThan(0);
    expect(arr.length).toBeLessThanOrEqual(4);
  });
});

describe("content types", () => {
  it("bandFor returns the per-type word band", () => {
    expect(bandFor("blog")).toEqual([1000, 2200]);
    expect(bandFor("landing")).toEqual([500, 1200]);
    expect(bandFor("product")).toEqual([120, 500]);
  });
  it("unknown type falls back to blog band", () => {
    // @ts-expect-error deliberately wrong
    expect(bandFor("nope")).toEqual([1000, 2200]);
  });
  it("labels + list cover all three", () => {
    expect(CONTENT_TYPES).toEqual(["blog", "landing", "product"]);
    expect(CONTENT_LABELS.landing).toBe("Landing Page");
    expect(CONTENT_LABELS.product).toBe("Product Description");
  });
});

describe("buildOutlinePrompt per type", () => {
  const base = { targetWords: 1600, tone: "professional", audience: "marketers" };
  it("blog keeps the SEO/AEO strategist framing + 2200 ceiling", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, { ...base, contentType: "blog" });
    expect(system).toContain("1000 and 2200");
    expect(system).toContain("Conclusion");
  });
  it("landing targets a conversion structure + its band", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, { ...base, contentType: "landing" });
    expect(system).toContain("500 and 1200");
    expect(system.toLowerCase()).toContain("call to action");
    expect(system.toLowerCase()).toContain("benefit");
  });
  it("product targets a short product structure + its band", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, { ...base, contentType: "product" });
    expect(system).toContain("120 and 500");
    expect(system.toLowerCase()).toContain("features");
  });
  it("missing contentType behaves as blog", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, base);
    expect(system).toContain("1000 and 2200");
  });
});
