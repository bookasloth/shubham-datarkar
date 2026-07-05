import { describe, it, expect } from "vitest";
import { discoverPages, getSitemapPaths } from "./discovery";

describe("discoverPages", () => {
  it("returns an array of PageEntry objects", async () => {
    const pages = await discoverPages();
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
  });

  it("includes known static pages", async () => {
    const pages = await discoverPages();
    const routes = pages.map((p) => p.route);
    expect(routes).toContain("/");
    expect(routes).toContain("/about");
    expect(routes).toContain("/blog");
    expect(routes).toContain("/services");
    expect(routes).toContain("/contact");
  });

  it("includes expanded dynamic routes", async () => {
    const pages = await discoverPages();
    const routes = pages.map((p) => p.route);
    // At least one blog post should be enumerated
    const blogPosts = routes.filter((r) => /^\/blog\/[^[].+\/[^[].+$/.test(r));
    expect(blogPosts.length).toBeGreaterThan(0);
  });

  it("flags admin pages as private", async () => {
    const pages = await discoverPages();
    const adminPages = pages.filter((p) => p.route.startsWith("/admin"));
    expect(adminPages.length).toBeGreaterThan(0);
    expect(adminPages.every((p) => p.isPrivate)).toBe(true);
  });

  it("cross-checks against sitemap", async () => {
    const pages = await discoverPages();
    const aboutPage = pages.find((p) => p.route === "/about");
    expect(aboutPage?.inSitemap).toBe(true);
  });
});

describe("getSitemapPaths", () => {
  it("returns sitemap paths as strings", () => {
    const paths = getSitemapPaths();
    expect(paths).toContain("/about");
    expect(paths).toContain("/blog");
  });
});
