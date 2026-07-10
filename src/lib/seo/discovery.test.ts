import { describe, it, expect } from "vitest";
import { discoverPages } from "./discovery";

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
    // Blog posts now come from the DB (unavailable offline), so assert against a
    // statically-sourced dynamic route instead — at least one service enumerated.
    const serviceRoutes = routes.filter((r) => /^\/services\/[^[]+$/.test(r));
    expect(serviceRoutes.length).toBeGreaterThan(0);
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

describe("sitemap membership", () => {
  it("excludes auth and account routes that used to leak into the sitemap", async () => {
    const pages = await discoverPages();
    const leaked = pages.filter((p) => p.inSitemap).map((p) => p.route);
    for (const route of ["/games/login", "/members/login", "/members/account", "/community/compose", "/unsubscribe", "/subscriber-assets"]) {
      expect(leaked).not.toContain(route);
    }
  });

  it("keeps real public routes in the sitemap", async () => {
    const pages = await discoverPages();
    const indexed = pages.filter((p) => p.inSitemap).map((p) => p.route);
    for (const route of ["/", "/about", "/blog", "/services", "/contact", "/faq", "/games", "/link"]) {
      expect(indexed).toContain(route);
    }
  });

  it("never puts an unexpanded dynamic template in the sitemap", async () => {
    const pages = await discoverPages();
    expect(pages.filter((p) => p.inSitemap && p.route.includes("["))).toEqual([]);
  });

  it("assigns every discovered page a pageType", async () => {
    const pages = await discoverPages();
    expect(pages.every((p) => ["pillar", "hub", "utility", "app"].includes(p.pageType))).toBe(true);
  });

  it("marks app routes private and non-indexable together", async () => {
    const pages = await discoverPages();
    for (const p of pages) {
      expect(p.isPrivate).toBe(p.pageType === "app");
      if (p.pageType === "app") expect(p.inSitemap).toBe(false);
    }
  });
});
