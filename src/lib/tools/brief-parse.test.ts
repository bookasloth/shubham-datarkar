import { describe, it, expect } from "vitest";
import { parseBrief, extractJson } from "./brief-parse";

describe("brief-parse", () => {
  it("parses a full brief and clamps shapes", () => {
    const raw = `Sure!\n{"title":"SaaS SEO in India","intent":"informational","wordCount":"1800-2400","outline":[{"heading":"What is SaaS SEO","points":["def","why"]},{"heading":"Tactics","points":["a","b"]}],"questions":["How much does SaaS SEO cost?"],"keywords":["saas seo","b2b seo india"]}`;
    const b = parseBrief(raw);
    expect(b.title).toBe("SaaS SEO in India");
    expect(b.outline).toHaveLength(2);
    expect(b.outline[0].points).toEqual(["def", "why"]);
    expect(b.questions).toEqual(["How much does SaaS SEO cost?"]);
    expect(b.keywords).toEqual(["saas seo", "b2b seo india"]);
  });

  it("drops malformed outline entries and non-string list items", () => {
    const b = parseBrief('{"outline":[{"heading":"Ok","points":["p",5]},{"nope":1}],"keywords":["k",2]}');
    expect(b.outline).toEqual([{ heading: "Ok", points: ["p"] }]);
    expect(b.keywords).toEqual(["k"]);
    expect(b.title).toBe("");
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
