import { describe, it, expect } from "vitest";
import {
  articleSchema,
  websiteSchema,
  organizationSchema,
  buildMetadata,
} from "@/lib/seo";
import { site } from "@/lib/site";

describe("articleSchema", () => {
  const base = { title: "T", description: "D", path: "/blog/seo/x", datePublished: "2026-01-01" };

  it("falls back to a real, existing image (never /og/default.png)", () => {
    const s = articleSchema(base);
    expect(s.image).toBe(`${site.url}/opengraph-image`);
    expect(String(s.image)).not.toContain("/og/default.png");
  });

  it("uses a provided per-post image when passed", () => {
    const s = articleSchema({ ...base, image: `${site.url}/blog/seo/x/opengraph-image` });
    expect(s.image).toBe(`${site.url}/blog/seo/x/opengraph-image`);
  });
});

describe("websiteSchema", () => {
  it("is a WebSite with a SearchAction targeting /search?q=", () => {
    const s = websiteSchema();
    expect(s["@type"]).toBe("WebSite");
    expect(s.url).toBe(site.url);
    expect(JSON.stringify(s.potentialAction)).toContain(`${site.url}/search?q={search_term_string}`);
  });
});

describe("organizationSchema", () => {
  it("includes a logo URL on our domain", () => {
    const s = organizationSchema();
    expect(typeof s.logo).toBe("string");
    expect(String(s.logo)).toContain(site.url);
  });
});

describe("buildMetadata", () => {
  it("twitter card creator is the real X handle", () => {
    const m = buildMetadata();
    expect((m.twitter as { creator?: string } | null)?.creator).toBe("@sndatarkar");
  });
});
