import { describe, it, expect } from "vitest";
import { analyzePage } from "./analyzer";
import type { PageEntry } from "./types";

const makeEntry = (route: string, filePath: string): PageEntry => ({
  route,
  filePath,
  isDynamic: false,
  isPrivate: false,
  inSitemap: true,
});

describe("analyzePage", () => {
  it("detects buildMetadata on /about page", async () => {
    const result = await analyzePage(makeEntry("/about", "src/app/about/page.tsx"));
    expect(result.hasMetadata).toBe(true);
    expect(result.metadataSource).toBe("buildMetadata");
  });

  it("detects schemas on /about page", async () => {
    const result = await analyzePage(makeEntry("/about", "src/app/about/page.tsx"));
    expect(result.schemas.length).toBeGreaterThan(0);
    expect(result.hasBreadcrumbs).toBe(true);
  });

  it("detects dedicated OG image for blog posts", async () => {
    const result = await analyzePage(
      makeEntry("/blog/seo/test", "src/app/blog/[category]/[slug]/page.tsx"),
    );
    expect(result.ogImageSource).toBe("dedicated");
  });

  it("detects root-fallback OG image for pages without dedicated image", async () => {
    const result = await analyzePage(makeEntry("/about", "src/app/about/page.tsx"));
    expect(result.ogImageSource).toBe("root-fallback");
  });

  it("returns content analysis counts", async () => {
    const result = await analyzePage(makeEntry("/about", "src/app/about/page.tsx"));
    expect(typeof result.h1Count).toBe("number");
    expect(typeof result.wordCount).toBe("number");
    expect(typeof result.readingTime).toBe("number");
    expect(typeof result.internalLinks).toBe("number");
    expect(typeof result.imageCount).toBe("number");
  });

  it("detects generateMetadata on dynamic pages", async () => {
    const result = await analyzePage(
      makeEntry("/blog/seo/test", "src/app/blog/[category]/[slug]/page.tsx"),
    );
    expect(result.metadataSource).toBe("generateMetadata");
  });
});
