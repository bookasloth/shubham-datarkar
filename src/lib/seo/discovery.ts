import fs from "node:fs";
import path from "node:path";
import type { PageEntry } from "./types";
import { PRIVATE_PREFIXES } from "./constants";
import { posts, blogCategories } from "@/lib/data/posts";
import { caseStudies } from "@/lib/data/case-studies";
import { services } from "@/lib/data/services";
import { tools } from "@/lib/data/tools";
import { products } from "@/lib/data/products";

const APP_DIR = path.join(process.cwd(), "src", "app");

// Static paths as enumerated by src/app/sitemap.ts. Kept in sync manually —
// see getSitemapPaths() below, which reconstructs the full sitemap path list
// from the same data sources sitemap.ts uses (rather than importing/requiring
// the sitemap module itself, which isn't reliably resolvable in this context).
const SITEMAP_STATIC_PATHS = [
  "",
  "/about",
  "/my-story",
  "/now",
  "/uses",
  "/philosophy",
  "/work",
  "/components/page-2",
  "/case-studies",
  "/testimonials",
  "/services",
  "/speaking",
  "/media-kit",
  "/blog",
  "/newsletter",
  "/resources",
  "/changelog",
  "/roadmap",
  "/products",
  "/tools",
  "/ai-experiments",
  "/components",
  "/contact",
  "/book",
  "/faq",
];

function findPageFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPageFiles(full));
    } else if (entry.name === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

function filePathToRoute(filePath: string): string {
  let rel = path.relative(APP_DIR, path.dirname(filePath));
  rel = rel.replace(/\\/g, "/");
  // Strip route groups: (groupName) → ""
  rel = rel.replace(/\([^)]+\)\/?/g, "");
  if (rel === "" || rel === ".") return "/";
  return `/${rel}`;
}

type DynamicExpansion = {
  pattern: RegExp;
  expand: () => { route: string }[];
};

const DYNAMIC_EXPANSIONS: DynamicExpansion[] = [
  {
    pattern: /^\/blog\/\[category\]\/\[slug\]$/,
    expand: () => posts.map((p) => ({ route: `/blog/${p.category}/${p.slug}` })),
  },
  {
    pattern: /^\/blog\/\[category\]$/,
    expand: () => blogCategories.map((c) => ({ route: `/blog/${c.slug}` })),
  },
  {
    pattern: /^\/services\/\[slug\]$/,
    expand: () => services.map((s) => ({ route: `/services/${s.slug}` })),
  },
  {
    pattern: /^\/products\/\[slug\]$/,
    expand: () => products.map((p) => ({ route: `/products/${p.slug}` })),
  },
  {
    pattern: /^\/case-studies\/\[slug\]$/,
    expand: () => caseStudies.map((c) => ({ route: `/case-studies/${c.slug}` })),
  },
  {
    pattern: /^\/tools\/\[slug\]$/,
    expand: () => tools.map((t) => ({ route: `/tools/${t.slug}` })),
  },
];

/**
 * Reconstructs the list of paths that src/app/sitemap.ts produces, from the
 * same data sources sitemap.ts consumes. This avoids importing/requiring the
 * sitemap module directly (its default export is a route-handler-shaped
 * function evaluated in a Next.js server context, not reliably importable
 * from a plain Node/Vitest script on this Windows machine).
 */
export function getSitemapPaths(): string[] {
  const paths = new Set<string>();

  for (const p of SITEMAP_STATIC_PATHS) {
    paths.add(p === "" ? "/" : p);
  }
  for (const c of blogCategories) {
    paths.add(`/blog/${c.slug}`);
  }
  for (const p of posts) {
    paths.add(`/blog/${p.category}/${p.slug}`);
  }
  for (const c of caseStudies) {
    paths.add(`/case-studies/${c.slug}`);
  }
  for (const s of services) {
    paths.add(`/services/${s.slug}`);
  }
  for (const t of tools) {
    paths.add(`/tools/${t.slug}`);
  }
  for (const p of products) {
    paths.add(`/products/${p.slug}`);
  }

  return Array.from(paths);
}

export async function discoverPages(): Promise<PageEntry[]> {
  const pageFiles = findPageFiles(APP_DIR);
  const sitemapPaths = new Set(getSitemapPaths());
  const pages: PageEntry[] = [];

  for (const filePath of pageFiles) {
    const route = filePathToRoute(filePath);
    const hasDynamicSegment = route.includes("[");
    const relFilePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

    if (hasDynamicSegment) {
      const expansion = DYNAMIC_EXPANSIONS.find((e) => e.pattern.test(route));
      if (expansion) {
        for (const expanded of expansion.expand()) {
          pages.push({
            route: expanded.route,
            filePath: relFilePath,
            isDynamic: true,
            isPrivate: PRIVATE_PREFIXES.some((p) => expanded.route.startsWith(p)),
            inSitemap: sitemapPaths.has(expanded.route),
          });
        }
      } else {
        // Dynamic route with no known data source — list the raw template.
        pages.push({
          route,
          filePath: relFilePath,
          isDynamic: true,
          isPrivate: PRIVATE_PREFIXES.some((p) => route.startsWith(p)),
          inSitemap: false,
        });
      }
    } else {
      pages.push({
        route,
        filePath: relFilePath,
        isDynamic: false,
        isPrivate: PRIVATE_PREFIXES.some((p) => route.startsWith(p)),
        inSitemap: sitemapPaths.has(route),
      });
    }
  }

  return pages.sort((a, b) => a.route.localeCompare(b.route));
}
