import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { discoverPages } from "./discovery";

/**
 * Every crawlable app route must serve `noindex`. robots.txt only disallows the
 * ROBOTS_DISALLOW_PREFIXES subtrees; the rest are fetched by Googlebot, so the
 * meta tag is the only thing that keeps them out of the index.
 *
 * This reads source, which is a proxy for what the server sends. It can lie in
 * both directions — a `noIndex: true` in a dead branch passes, and a page that
 * inherits `robots: { index: false }` from a layout would fail if we only looked
 * at the page. So it also walks the ancestor layouts, which is how the whole
 * `/members` subtree is actually protected.
 *
 * The honest check is against rendered HTML, which the PR verifies by driving a
 * dev server. Keep this only as a fast red/green signal.
 */

/** True when this file, or any layout above it, declares noindex. */
function declaresNoIndex(pageFilePath: string): boolean {
  const declares = (file: string) => {
    if (!fs.existsSync(file)) return false;
    const src = fs.readFileSync(file, "utf-8");
    return /noIndex:\s*true/.test(src) || /index:\s*false/.test(src);
  };

  if (declares(path.join(process.cwd(), pageFilePath))) return true;

  // Walk up from the page's directory to src/app, checking each layout.tsx.
  const appDir = path.join(process.cwd(), "src", "app");
  let dir = path.dirname(path.join(process.cwd(), pageFilePath));
  while (dir.startsWith(appDir)) {
    if (declares(path.join(dir, "layout.tsx"))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

describe("noindex coverage", () => {
  it("every app route outside /admin declares noIndex, directly or via a layout", async () => {
    const pages = await discoverPages();
    const targets = pages.filter((p) => p.pageType === "app" && !p.route.startsWith("/admin"));
    expect(targets.length).toBeGreaterThan(0);

    const missing = targets.filter((p) => !declaresNoIndex(p.filePath)).map((p) => p.route);
    expect(missing).toEqual([]);
  });

  it("does not noindex the public landings", async () => {
    // The dangerous direction. De-indexing a real page is worse than missing an
    // app route: /games, /community and /me are public content.
    const pages = await discoverPages();
    const publicLandings = pages.filter((p) => ["/games", "/community", "/me", "/about"].includes(p.route));
    expect(publicLandings.length).toBe(4);
    for (const p of publicLandings) {
      expect(declaresNoIndex(p.filePath), p.route).toBe(false);
    }
  });
});
