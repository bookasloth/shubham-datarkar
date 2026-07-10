import fs from "node:fs";
import path from "node:path";
import type { PageEntry } from "./types";
import { isIndexable, isPrivate, pageTypeOf } from "./routes";
import { blogCategories } from "@/lib/data/posts";
import { caseStudies } from "@/lib/data/case-studies";
import { services } from "@/lib/data/services";
import { tools } from "@/lib/data/tools";
import { products } from "@/lib/data/products";

const APP_DIR = path.join(process.cwd(), "src", "app");

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

// Blog posts live in the DB, so their expansion is injected at call time
// (see discoverPages) rather than sourced from a static array here.
const DYNAMIC_EXPANSIONS: DynamicExpansion[] = [
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

export async function discoverPages(
  blogPosts: { category: string; slug: string }[] = [],
): Promise<PageEntry[]> {
  const pageFiles = findPageFiles(APP_DIR);
  // Inject the DB-sourced blog-post expansion alongside the static ones.
  const expansions: DynamicExpansion[] = [
    ...DYNAMIC_EXPANSIONS,
    {
      pattern: /^\/blog\/\[category\]\/\[slug\]$/,
      expand: () => blogPosts.map((p) => ({ route: `/blog/${p.category}/${p.slug}` })),
    },
  ];
  const pages: PageEntry[] = [];

  for (const filePath of pageFiles) {
    const route = filePathToRoute(filePath);
    const hasDynamicSegment = route.includes("[");
    const relFilePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

    if (hasDynamicSegment) {
      const expansion = expansions.find((e) => e.pattern.test(route));
      if (expansion) {
        for (const expanded of expansion.expand()) {
          pages.push({
            route: expanded.route,
            filePath: relFilePath,
            isDynamic: true,
            isPrivate: isPrivate(expanded.route),
            inSitemap: isIndexable(expanded.route),
            pageType: pageTypeOf(expanded.route),
          });
        }
      } else {
        // Dynamic route with no known data source — list the raw template.
        pages.push({
          route,
          filePath: relFilePath,
          isDynamic: true,
          isPrivate: isPrivate(route),
          inSitemap: isIndexable(route),
          pageType: pageTypeOf(route),
        });
      }
    } else {
      pages.push({
        route,
        filePath: relFilePath,
        isDynamic: false,
        isPrivate: isPrivate(route),
        inSitemap: isIndexable(route),
        pageType: pageTypeOf(route),
      });
    }
  }

  return pages.sort((a, b) => a.route.localeCompare(b.route));
}
