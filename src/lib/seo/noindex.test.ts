import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { discoverPages } from "./discovery";

/**
 * Every crawlable app route must serve `noindex`. robots.txt only disallows the
 * ROBOTS_DISALLOW_PREFIXES subtrees; the rest are fetched by Googlebot, so the
 * meta tag is the only thing that keeps them out of the index.
 */
describe("noindex coverage", () => {
  it("every app route outside /admin declares noIndex", async () => {
    const pages = await discoverPages();
    const targets = pages.filter((p) => p.pageType === "app" && !p.route.startsWith("/admin"));
    expect(targets.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const page of targets) {
      const src = fs.readFileSync(path.join(process.cwd(), page.filePath), "utf-8");
      if (!/noIndex:\s*true/.test(src)) missing.push(page.route);
    }
    expect(missing).toEqual([]);
  });
});
