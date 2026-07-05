# SEO Audit Dashboard — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only SEO/GEO/AEO audit dashboard at `/admin/seo` that auto-discovers every public page, analyzes metadata/schema/content from source files, and produces checklist-based scores with actionable recommendations.

**Architecture:** Filesystem scan of `src/app/` discovers all `page.tsx` files, converts paths to routes, enumerates dynamic route instances from existing data sources. Source-level regex/pattern analysis extracts metadata, schema, and content signals. Checklist-based scoring produces SEO/GEO/AEO percentages. Three admin routes (`/admin/seo`, `/admin/seo/pages`, `/admin/seo/pages/[page]`) display results using existing admin components.

**Tech Stack:** Next.js App Router, TypeScript, Node.js `fs`/`path` (server-only), existing admin UI components (PageHeader, DataTable, KPIWidget, StatusBadge, AdminCard)

## Global Constraints

- No database tables — pure filesystem + static data analysis
- No modifications to existing pages — only new files + one nav-config addition
- All admin routes use `export const dynamic = "force-dynamic"`
- Follow existing admin patterns: server component page → client component for interactivity
- Admin CSS variables: `--admin-text`, `--admin-text-muted`, `--admin-accent`, `--admin-border`, etc.
- Admin components imported from `@/components/admin` and `@/components/admin/widgets`
- Use `"use client"` directive only on interactive client components
- Data sources are static arrays exported from `src/lib/data/*.ts` (posts, services, products, caseStudies, tools, blogCategories)

---

### Task 1: Types & Constants

**Files:**
- Create: `src/lib/seo/types.ts`
- Create: `src/lib/seo/constants.ts`

**Interfaces:**
- Consumes: Nothing (foundational)
- Produces: `PageEntry`, `PageAnalysis`, `PageScores`, `AuditResult`, `ScoreColor`, `CheckResult`, `PRIVATE_PREFIXES`, `SEO_CHECKS`, `GEO_CHECKS`, `AEO_CHECKS`, `scoreColor()`

- [ ] **Step 1: Create types file**

Create `src/lib/seo/types.ts`:

```ts
export type PageEntry = {
  route: string;
  filePath: string;
  isDynamic: boolean;
  isPrivate: boolean;
  inSitemap: boolean;
};

export type MetadataSource = "buildMetadata" | "static-export" | "generateMetadata" | "none";

export type PageAnalysis = {
  hasMetadata: boolean;
  metadataSource: MetadataSource;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  robotsIndex: boolean;
  robotsFollow: boolean;

  schemas: string[];
  hasBreadcrumbs: boolean;

  ogImageSource: "dedicated" | "root-fallback" | "none";

  h1Count: number;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  readingTime: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  missingAltCount: number;
};

export type ScoreColor = "red" | "orange" | "yellow" | "green";

export type CheckResult = {
  id: string;
  label: string;
  passed: boolean;
  category: "seo" | "geo" | "aeo";
  priority: "high" | "medium" | "low";
};

export type ScoreBreakdown = {
  score: number;
  passed: string[];
  failed: string[];
};

export type PageScores = {
  seo: ScoreBreakdown;
  geo: ScoreBreakdown;
  aeo: ScoreBreakdown;
  overall: number;
  color: ScoreColor;
  checks: CheckResult[];
};

export type PageAuditEntry = {
  entry: PageEntry;
  analysis: PageAnalysis;
  scores: PageScores;
};

export type AuditSummary = {
  totalPages: number;
  indexedPages: number;
  notIndexedPages: number;
  missingMetadata: number;
  missingSchema: number;
  missingOgImage: number;
  avgSeoScore: number;
  avgGeoScore: number;
  avgAeoScore: number;
  issuesByType: { label: string; count: number }[];
  colorDistribution: Record<ScoreColor, number>;
};

export type AuditResult = {
  pages: PageAuditEntry[];
  summary: AuditSummary;
};
```

- [ ] **Step 2: Create constants file**

Create `src/lib/seo/constants.ts`:

```ts
export const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/login", "/settings", "/profile", "/success", "/search"];

export const SCHEMA_FUNCTIONS = [
  "articleSchema",
  "breadcrumbSchema",
  "faqSchema",
  "serviceSchema",
  "productSchema",
  "reviewSchema",
  "profilePageSchema",
  "organizationSchema",
  "websiteSchema",
  "speakingServiceSchema",
] as const;

export const SCHEMA_DISPLAY_NAMES: Record<string, string> = {
  articleSchema: "Article",
  breadcrumbSchema: "Breadcrumb",
  faqSchema: "FAQ",
  serviceSchema: "Service",
  productSchema: "Product",
  reviewSchema: "Review",
  profilePageSchema: "ProfilePage",
  organizationSchema: "Organization",
  websiteSchema: "WebSite",
  speakingServiceSchema: "Speaking",
};

export function scoreColor(score: number): "red" | "orange" | "yellow" | "green" {
  if (score >= 85) return "green";
  if (score >= 70) return "yellow";
  if (score >= 50) return "orange";
  return "red";
}

export const SCORE_TONE = {
  red: "danger",
  orange: "warning",
  yellow: "warning",
  green: "success",
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/seo/types.ts src/lib/seo/constants.ts
git commit -m "feat(seo): add types and constants for SEO audit system"
```

---

### Task 2: Page Discovery Engine

**Files:**
- Create: `src/lib/seo/discovery.ts`
- Test: `src/lib/seo/discovery.test.ts`

**Interfaces:**
- Consumes: `PageEntry` from `types.ts`, `PRIVATE_PREFIXES` from `constants.ts`, data sources from `src/lib/data/*.ts`
- Produces: `discoverPages(): Promise<PageEntry[]>`, `getSitemapPaths(): string[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo/discovery.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo/discovery.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/discovery.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type { PageEntry } from "./types";
import { PRIVATE_PREFIXES } from "./constants";
import { posts, blogCategories } from "@/lib/data/posts";
import { caseStudies } from "@/lib/data/case-studies";
import { services } from "@/lib/data/services";
import { tools } from "@/lib/data/tools";
import { products } from "@/lib/data/products";
import { site } from "@/lib/site";

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
  expand: () => { route: string; isDynamic: true }[];
};

const DYNAMIC_EXPANSIONS: DynamicExpansion[] = [
  {
    pattern: /^\/blog\/\[category\]\/\[slug\]$/,
    expand: () =>
      posts.map((p) => ({ route: `/blog/${p.category}/${p.slug}`, isDynamic: true as const })),
  },
  {
    pattern: /^\/blog\/\[category\]$/,
    expand: () =>
      blogCategories.map((c) => ({ route: `/blog/${c.slug}`, isDynamic: true as const })),
  },
  {
    pattern: /^\/services\/\[slug\]$/,
    expand: () =>
      services.map((s) => ({ route: `/services/${s.slug}`, isDynamic: true as const })),
  },
  {
    pattern: /^\/products\/\[slug\]$/,
    expand: () =>
      products.map((p) => ({ route: `/products/${p.slug}`, isDynamic: true as const })),
  },
  {
    pattern: /^\/case-studies\/\[slug\]$/,
    expand: () =>
      caseStudies.map((c) => ({ route: `/case-studies/${c.slug}`, isDynamic: true as const })),
  },
  {
    pattern: /^\/tools\/\[slug\]$/,
    expand: () =>
      tools.map((t) => ({ route: `/tools/${t.slug}`, isDynamic: true as const })),
  },
];

export function getSitemapPaths(): string[] {
  const base = site.url;
  const sitemapMod = require("@/app/sitemap");
  const entries: { url: string }[] =
    typeof sitemapMod.default === "function" ? sitemapMod.default() : sitemapMod.default;
  return entries.map((e) => e.url.replace(base, "") || "/");
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
        // Dynamic route with no known data source — list template
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/seo/discovery.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/discovery.ts src/lib/seo/discovery.test.ts
git commit -m "feat(seo): page discovery engine — filesystem scan + dynamic route expansion"
```

---

### Task 3: Metadata & Schema Analyzer

**Files:**
- Create: `src/lib/seo/analyzer.ts`
- Test: `src/lib/seo/analyzer.test.ts`

**Interfaces:**
- Consumes: `PageEntry`, `PageAnalysis`, `MetadataSource` from `types.ts`, `SCHEMA_FUNCTIONS` from `constants.ts`
- Produces: `analyzePage(entry: PageEntry): Promise<PageAnalysis>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo/analyzer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo/analyzer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/analyzer.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type { PageEntry, PageAnalysis, MetadataSource } from "./types";
import { SCHEMA_FUNCTIONS } from "./constants";

function readSource(filePath: string): string {
  const abs = path.join(process.cwd(), filePath);
  try {
    return fs.readFileSync(abs, "utf-8");
  } catch {
    return "";
  }
}

function detectMetadataSource(source: string): MetadataSource {
  if (/export\s+(async\s+)?function\s+generateMetadata/.test(source)) return "generateMetadata";
  if (/buildMetadata\s*\(/.test(source)) return "buildMetadata";
  if (/export\s+const\s+metadata/.test(source)) return "static-export";
  return "none";
}

function extractBuildMetadataArg(source: string, key: string): string | null {
  const pattern = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const buildCall = source.match(/buildMetadata\s*\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)/s);
  if (!buildCall) return null;
  const match = buildCall[1].match(pattern);
  return match?.[1] ?? null;
}

function extractStaticMetadataField(source: string, key: string): string | null {
  const metadataBlock = source.match(/export\s+const\s+metadata[^=]*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
  if (!metadataBlock) return null;
  const pattern = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const match = metadataBlock[1].match(pattern);
  return match?.[1] ?? null;
}

function detectSchemas(source: string): string[] {
  return SCHEMA_FUNCTIONS.filter((fn) => source.includes(fn));
}

function checkOgImage(filePath: string): "dedicated" | "root-fallback" | "none" {
  const dir = path.join(process.cwd(), path.dirname(filePath));
  const ogFile = path.join(dir, "opengraph-image.tsx");
  if (fs.existsSync(ogFile)) return "dedicated";
  const rootOg = path.join(process.cwd(), "src", "app", "opengraph-image.tsx");
  if (fs.existsSync(rootOg)) return "root-fallback";
  return "none";
}

function countPattern(source: string, pattern: RegExp): number {
  return (source.match(pattern) || []).length;
}

function estimateWordCount(source: string): number {
  // Strip imports, JSX tags, and code constructs; count remaining words
  let text = source
    .replace(/import\s+.*?from\s+["'].*?["'];?/g, "")
    .replace(/export\s+(default\s+)?(async\s+)?function\s+\w+/g, "")
    .replace(/export\s+const\s+\w+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/className="[^"]*"/g, "")
    .replace(/["'`]([^"'`]{2,})["'`]/g, "$1");
  const words = text.split(/\s+/).filter((w) => w.length > 1 && !/^[{}()[\];,.<>=!&|?:]+$/.test(w));
  return Math.round(words.length * 0.4); // discount code tokens
}

function countMissingAlt(source: string): number {
  const imgTags = source.match(/<(?:img|Image|CldImage)\s[^>]*>/g) || [];
  return imgTags.filter((tag) => !/alt\s*=/.test(tag)).length;
}

export async function analyzePage(entry: PageEntry): Promise<PageAnalysis> {
  const source = readSource(entry.filePath);
  const metadataSource = detectMetadataSource(source);

  let title: string | null = null;
  let description: string | null = null;

  if (metadataSource === "buildMetadata") {
    title = extractBuildMetadataArg(source, "title");
    description = extractBuildMetadataArg(source, "description");
  } else if (metadataSource === "static-export") {
    title = extractStaticMetadataField(source, "title");
    description = extractStaticMetadataField(source, "description");
  }
  // generateMetadata: can't extract static values, leave null

  const hasMetadata = metadataSource !== "none";
  const hasBuildMetadata = metadataSource === "buildMetadata";

  const schemas = detectSchemas(source);

  const wordCount = estimateWordCount(source);

  return {
    hasMetadata,
    metadataSource,
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    // buildMetadata always sets canonical, OG, and Twitter
    hasCanonical: hasBuildMetadata || metadataSource === "generateMetadata",
    hasOgTags: hasBuildMetadata || metadataSource === "generateMetadata",
    hasTwitterCard: hasBuildMetadata || metadataSource === "generateMetadata",
    robotsIndex: !source.includes("noIndex: true") && !source.includes("index: false"),
    robotsFollow: !source.includes("follow: false"),

    schemas: schemas.map((fn) => fn.replace("Schema", "")),
    hasBreadcrumbs: schemas.includes("breadcrumbSchema"),

    ogImageSource: checkOgImage(entry.filePath),

    h1Count: countPattern(source, /<h1[\s>]/gi),
    h2Count: countPattern(source, /<h2[\s>]/gi),
    h3Count: countPattern(source, /<h3[\s>]/gi),
    wordCount,
    readingTime: Math.max(1, Math.round(wordCount / 200)),
    internalLinks: countPattern(source, /href=["']\/[^"']*/g),
    externalLinks: countPattern(source, /href=["']https?:\/\//g),
    imageCount: countPattern(source, /<(?:img|Image|CldImage)[\s>]/gi),
    missingAltCount: countMissingAlt(source),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/seo/analyzer.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/analyzer.ts src/lib/seo/analyzer.test.ts
git commit -m "feat(seo): metadata & schema analyzer — source-level pattern extraction"
```

---

### Task 4: Scoring Engine

**Files:**
- Create: `src/lib/seo/scoring.ts`
- Test: `src/lib/seo/scoring.test.ts`

**Interfaces:**
- Consumes: `PageEntry`, `PageAnalysis`, `PageScores`, `CheckResult` from `types.ts`, `scoreColor` from `constants.ts`
- Produces: `scorePage(entry: PageEntry, analysis: PageAnalysis): PageScores`

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo/scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { scorePage } from "./scoring";
import type { PageEntry, PageAnalysis } from "./types";

const goodEntry: PageEntry = {
  route: "/about",
  filePath: "src/app/about/page.tsx",
  isDynamic: false,
  isPrivate: false,
  inSitemap: true,
};

const goodAnalysis: PageAnalysis = {
  hasMetadata: true,
  metadataSource: "buildMetadata",
  title: "About Shubham Datarkar",
  titleLength: 25,
  description: "Shubham Datarkar is a founder, marketer, and copywriter building things that make other things easier.",
  descriptionLength: 101,
  hasCanonical: true,
  hasOgTags: true,
  hasTwitterCard: true,
  robotsIndex: true,
  robotsFollow: true,
  schemas: ["breadcrumb", "profilePage"],
  hasBreadcrumbs: true,
  ogImageSource: "root-fallback",
  h1Count: 1,
  h2Count: 3,
  h3Count: 2,
  wordCount: 500,
  readingTime: 3,
  internalLinks: 5,
  externalLinks: 2,
  imageCount: 3,
  missingAltCount: 0,
};

describe("scorePage", () => {
  it("returns SEO/GEO/AEO scores as percentages 0-100", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(scores.seo.score).toBeGreaterThanOrEqual(0);
    expect(scores.seo.score).toBeLessThanOrEqual(100);
    expect(scores.geo.score).toBeGreaterThanOrEqual(0);
    expect(scores.geo.score).toBeLessThanOrEqual(100);
    expect(scores.aeo.score).toBeGreaterThanOrEqual(0);
    expect(scores.aeo.score).toBeLessThanOrEqual(100);
  });

  it("returns overall as weighted average", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    const expected = Math.round(scores.seo.score * 0.5 + scores.geo.score * 0.3 + scores.aeo.score * 0.2);
    expect(scores.overall).toBe(expected);
  });

  it("returns correct color based on overall score", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(["red", "orange", "yellow", "green"]).toContain(scores.color);
  });

  it("tracks passed and failed check labels", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(scores.seo.passed.length + scores.seo.failed.length).toBe(12);
    expect(scores.geo.passed.length + scores.geo.failed.length).toBe(10);
    expect(scores.aeo.passed.length + scores.aeo.failed.length).toBe(8);
  });

  it("includes all checks with category and priority", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(scores.checks.length).toBe(30); // 12 + 10 + 8
    scores.checks.forEach((c) => {
      expect(["seo", "geo", "aeo"]).toContain(c.category);
      expect(["high", "medium", "low"]).toContain(c.priority);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo/scoring.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/scoring.ts`:

```ts
import type { PageEntry, PageAnalysis, PageScores, CheckResult, ScoreBreakdown } from "./types";
import { scoreColor } from "./constants";

type Check = {
  id: string;
  label: string;
  test: (entry: PageEntry, analysis: PageAnalysis) => boolean;
  priority: "high" | "medium" | "low";
};

const SEO_CHECKS: Check[] = [
  { id: "seo-has-title", label: "Has title", test: (_, a) => !!a.title || a.metadataSource === "generateMetadata", priority: "high" },
  { id: "seo-title-length", label: "Title length 30-60 chars", test: (_, a) => a.titleLength >= 30 && a.titleLength <= 60, priority: "medium" },
  { id: "seo-has-desc", label: "Has description", test: (_, a) => !!a.description || a.metadataSource === "generateMetadata", priority: "high" },
  { id: "seo-desc-length", label: "Description length 120-160 chars", test: (_, a) => a.descriptionLength >= 120 && a.descriptionLength <= 160, priority: "medium" },
  { id: "seo-canonical", label: "Has canonical URL", test: (_, a) => a.hasCanonical, priority: "high" },
  { id: "seo-og", label: "Has Open Graph tags", test: (_, a) => a.hasOgTags, priority: "medium" },
  { id: "seo-twitter", label: "Has Twitter card", test: (_, a) => a.hasTwitterCard, priority: "low" },
  { id: "seo-og-image", label: "Has dedicated OG image", test: (_, a) => a.ogImageSource === "dedicated", priority: "low" },
  { id: "seo-breadcrumb", label: "Has breadcrumb schema", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "seo-h1-present", label: "Has at least one H1", test: (_, a) => a.h1Count >= 1, priority: "high" },
  { id: "seo-h1-single", label: "No more than one H1", test: (_, a) => a.h1Count <= 1, priority: "medium" },
  { id: "seo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const GEO_CHECKS: Check[] = [
  { id: "geo-schema", label: "Has structured data", test: (_, a) => a.schemas.length > 0, priority: "high" },
  { id: "geo-author", label: "Has author/person schema", test: (_, a) => a.schemas.some((s) => ["profilePage", "person"].includes(s.toLowerCase())), priority: "medium" },
  { id: "geo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("faq"), priority: "medium" },
  { id: "geo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "geo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0 || a.metadataSource === "generateMetadata", priority: "high" },
  { id: "geo-entity-schema", label: "Has entity-relevant schema", test: (_, a) => a.schemas.some((s) => ["article", "service", "product", "profilePage", "organization"].includes(s)), priority: "medium" },
  { id: "geo-word-count", label: "Word count > 300", test: (_, a) => a.wordCount > 300, priority: "medium" },
  { id: "geo-internal-links", label: "Has internal links > 2", test: (_, a) => a.internalLinks > 2, priority: "low" },
  { id: "geo-content-schema", label: "Content type schema matches page", test: (_, a) => a.schemas.length > 1, priority: "low" },
  { id: "geo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const AEO_CHECKS: Check[] = [
  { id: "aeo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("faq"), priority: "high" },
  { id: "aeo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "aeo-headings", label: "Has structured headings (H1 + H2s)", test: (_, a) => a.h1Count >= 1 && a.h2Count >= 1, priority: "high" },
  { id: "aeo-word-count", label: "Word count > 200", test: (_, a) => a.wordCount > 200, priority: "medium" },
  { id: "aeo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0 || a.metadataSource === "generateMetadata", priority: "medium" },
  { id: "aeo-lists", label: "Has list or table patterns", test: (_, a) => a.h2Count >= 2 || a.internalLinks > 3, priority: "low" },
  { id: "aeo-h2-count", label: "H2 count >= 2", test: (_, a) => a.h2Count >= 2, priority: "medium" },
  { id: "aeo-schema", label: "Has schema.org markup", test: (_, a) => a.schemas.length > 0, priority: "high" },
];

function runChecks(
  checks: Check[],
  category: "seo" | "geo" | "aeo",
  entry: PageEntry,
  analysis: PageAnalysis,
): { breakdown: ScoreBreakdown; results: CheckResult[] } {
  const results: CheckResult[] = checks.map((check) => ({
    id: check.id,
    label: check.label,
    passed: check.test(entry, analysis),
    category,
    priority: check.priority,
  }));
  const passed = results.filter((r) => r.passed).map((r) => r.label);
  const failed = results.filter((r) => !r.passed).map((r) => r.label);
  const score = results.length > 0 ? Math.round((passed.length / results.length) * 100) : 0;
  return { breakdown: { score, passed, failed }, results };
}

export function scorePage(entry: PageEntry, analysis: PageAnalysis): PageScores {
  const seo = runChecks(SEO_CHECKS, "seo", entry, analysis);
  const geo = runChecks(GEO_CHECKS, "geo", entry, analysis);
  const aeo = runChecks(AEO_CHECKS, "aeo", entry, analysis);

  const overall = Math.round(seo.breakdown.score * 0.5 + geo.breakdown.score * 0.3 + aeo.breakdown.score * 0.2);

  return {
    seo: seo.breakdown,
    geo: geo.breakdown,
    aeo: aeo.breakdown,
    overall,
    color: scoreColor(overall),
    checks: [...seo.results, ...geo.results, ...aeo.results],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/seo/scoring.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/scoring.ts src/lib/seo/scoring.test.ts
git commit -m "feat(seo): scoring engine — checklist-based SEO/GEO/AEO scores"
```

---

### Task 5: Audit Orchestrator

**Files:**
- Create: `src/lib/seo/audit.ts`
- Test: `src/lib/seo/audit.test.ts`

**Interfaces:**
- Consumes: `discoverPages()` from `discovery.ts`, `analyzePage()` from `analyzer.ts`, `scorePage()` from `scoring.ts`, all types from `types.ts`
- Produces: `runFullAudit(): Promise<AuditResult>`, `auditSinglePage(route: string): Promise<PageAuditEntry | null>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo/audit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runFullAudit, auditSinglePage } from "./audit";

describe("runFullAudit", () => {
  it("returns pages array and summary", async () => {
    const result = await runFullAudit();
    expect(Array.isArray(result.pages)).toBe(true);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.summary.totalPages).toBeGreaterThan(0);
  });

  it("summary counts are consistent", async () => {
    const result = await runFullAudit();
    const { summary } = result;
    expect(summary.indexedPages + summary.notIndexedPages).toBe(summary.totalPages);
  });

  it("summary has color distribution", async () => {
    const result = await runFullAudit();
    const total = Object.values(result.summary.colorDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(result.summary.totalPages);
  });
});

describe("auditSinglePage", () => {
  it("returns audit entry for known route", async () => {
    const entry = await auditSinglePage("/about");
    expect(entry).not.toBeNull();
    expect(entry!.entry.route).toBe("/about");
    expect(entry!.scores.seo.score).toBeGreaterThanOrEqual(0);
  });

  it("returns null for unknown route", async () => {
    const entry = await auditSinglePage("/nonexistent-xyz-123");
    expect(entry).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo/audit.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/audit.ts`:

```ts
import type { AuditResult, AuditSummary, PageAuditEntry, ScoreColor } from "./types";
import { discoverPages } from "./discovery";
import { analyzePage } from "./analyzer";
import { scorePage } from "./scoring";

function buildSummary(pages: PageAuditEntry[]): AuditSummary {
  const publicPages = pages.filter((p) => !p.entry.isPrivate);

  const indexed = publicPages.filter((p) => p.analysis.robotsIndex && p.entry.inSitemap);
  const notIndexed = publicPages.filter((p) => !p.analysis.robotsIndex || !p.entry.inSitemap);
  const missingMetadata = publicPages.filter((p) => !p.analysis.hasMetadata);
  const missingSchema = publicPages.filter((p) => p.analysis.schemas.length === 0);
  const missingOgImage = publicPages.filter((p) => p.analysis.ogImageSource !== "dedicated");

  const avgSeo = publicPages.length > 0
    ? Math.round(publicPages.reduce((sum, p) => sum + p.scores.seo.score, 0) / publicPages.length)
    : 0;
  const avgGeo = publicPages.length > 0
    ? Math.round(publicPages.reduce((sum, p) => sum + p.scores.geo.score, 0) / publicPages.length)
    : 0;
  const avgAeo = publicPages.length > 0
    ? Math.round(publicPages.reduce((sum, p) => sum + p.scores.aeo.score, 0) / publicPages.length)
    : 0;

  // Aggregate issues from all failed checks
  const issueCounts = new Map<string, number>();
  for (const page of publicPages) {
    for (const check of page.scores.checks) {
      if (!check.passed) {
        issueCounts.set(check.label, (issueCounts.get(check.label) ?? 0) + 1);
      }
    }
  }
  const issuesByType = [...issueCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const colorDistribution: Record<ScoreColor, number> = { red: 0, orange: 0, yellow: 0, green: 0 };
  for (const page of publicPages) {
    colorDistribution[page.scores.color]++;
  }

  return {
    totalPages: publicPages.length,
    indexedPages: indexed.length,
    notIndexedPages: notIndexed.length,
    missingMetadata: missingMetadata.length,
    missingSchema: missingSchema.length,
    missingOgImage: missingOgImage.length,
    avgSeoScore: avgSeo,
    avgGeoScore: avgGeo,
    avgAeoScore: avgAeo,
    issuesByType,
    colorDistribution,
  };
}

export async function runFullAudit(): Promise<AuditResult> {
  const entries = await discoverPages();
  const pages: PageAuditEntry[] = [];

  for (const entry of entries) {
    const analysis = await analyzePage(entry);
    const scores = scorePage(entry, analysis);
    pages.push({ entry, analysis, scores });
  }

  return { pages, summary: buildSummary(pages) };
}

export async function auditSinglePage(route: string): Promise<PageAuditEntry | null> {
  const entries = await discoverPages();
  const entry = entries.find((e) => e.route === route);
  if (!entry) return null;
  const analysis = await analyzePage(entry);
  const scores = scorePage(entry, analysis);
  return { entry, analysis, scores };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/seo/audit.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/audit.ts src/lib/seo/audit.test.ts
git commit -m "feat(seo): audit orchestrator — discovery + analysis + scoring pipeline"
```

---

### Task 6: SEO Dashboard Page (`/admin/seo`)

**Files:**
- Create: `src/app/admin/seo/page.tsx`
- Create: `src/app/admin/seo/seo-dashboard.tsx`

**Interfaces:**
- Consumes: `runFullAudit()` from `audit.ts`, `AuditResult`, `AuditSummary` from `types.ts`, `SCORE_TONE` from `constants.ts`
- Produces: Dashboard route at `/admin/seo`

- [ ] **Step 1: Create the dashboard client component**

Create `src/app/admin/seo/seo-dashboard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { AdminCard, StatusBadge, AdminButton } from "@/components/admin";
import { KPIWidget } from "@/components/admin/widgets";
import type { AuditSummary, ScoreColor } from "@/lib/seo/types";
import { SCORE_TONE } from "@/lib/seo/constants";

const COLOR_LABELS: Record<ScoreColor, string> = {
  green: "Good (85-100)",
  yellow: "OK (70-84)",
  orange: "Needs work (50-69)",
  red: "Critical (0-49)",
};

export function SeoDashboard({ summary }: { summary: AuditSummary }) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <KPIWidget label="Total Pages" value={summary.totalPages} href="/admin/seo/pages" />
        <KPIWidget label="Indexed" value={summary.indexedPages} />
        <KPIWidget label="Not Indexed" value={summary.notIndexedPages} />
        <KPIWidget label="Missing Metadata" value={summary.missingMetadata} />
        <KPIWidget label="Missing Schema" value={summary.missingSchema} />
        <KPIWidget label="Missing OG Image" value={summary.missingOgImage} />
        <KPIWidget label="Avg SEO" value={`${summary.avgSeoScore}%`} />
        <KPIWidget label="Avg GEO" value={`${summary.avgGeoScore}%`} />
      </div>

      {/* Score distribution */}
      <AdminCard>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
          Score Distribution
        </h2>
        <div className="flex flex-wrap gap-3">
          {(["green", "yellow", "orange", "red"] as const).map((color) => (
            <div key={color} className="flex items-center gap-2">
              <StatusBadge tone={SCORE_TONE[color]}>
                {summary.colorDistribution[color]}
              </StatusBadge>
              <span className="text-sm text-admin-text-muted">{COLOR_LABELS[color]}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Top issues */}
      {summary.issuesByType.length > 0 && (
        <AdminCard>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
            Top Issues
          </h2>
          <div className="flex flex-col gap-2">
            {summary.issuesByType.slice(0, 10).map((issue) => (
              <div key={issue.label} className="flex items-center justify-between text-sm">
                <span className="text-admin-text">{issue.label}</span>
                <StatusBadge tone="danger">{issue.count} pages</StatusBadge>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Quick link */}
      <div>
        <AdminButton asChild>
          <Link href="/admin/seo/pages">View All Pages</Link>
        </AdminButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the server page component**

Create `src/app/admin/seo/page.tsx`:

```tsx
import { PageHeader } from "@/components/admin";
import { runFullAudit } from "@/lib/seo/audit";
import { SeoDashboard } from "./seo-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const audit = await runFullAudit();
  return (
    <div>
      <PageHeader
        title="SEO Dashboard"
        description={`${audit.summary.totalPages} public pages analyzed. Avg SEO: ${audit.summary.avgSeoScore}%, GEO: ${audit.summary.avgGeoScore}%, AEO: ${audit.summary.avgAeoScore}%.`}
      />
      <SeoDashboard summary={audit.summary} />
    </div>
  );
}
```

- [ ] **Step 3: Verify page renders in browser**

Start dev server, navigate to `/admin/seo`. Verify:
- KPI widgets display with correct counts
- Score distribution shows colored badges
- Top issues list appears
- "View All Pages" link points to `/admin/seo/pages`

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/seo/page.tsx src/app/admin/seo/seo-dashboard.tsx
git commit -m "feat(seo): admin SEO dashboard with KPIs, score distribution, top issues"
```

---

### Task 7: Pages List (`/admin/seo/pages`)

**Files:**
- Create: `src/app/admin/seo/pages/page.tsx`
- Create: `src/app/admin/seo/pages/pages-table.tsx`

**Interfaces:**
- Consumes: `runFullAudit()` from `audit.ts`, `PageAuditEntry` from `types.ts`, `SCORE_TONE` from `constants.ts`
- Produces: Page list route at `/admin/seo/pages` with DataTable

- [ ] **Step 1: Create the client DataTable component**

Create `src/app/admin/seo/pages/pages-table.tsx`:

```tsx
"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin";
import { DataTable, type Column } from "@/components/admin/data/data-table";
import type { PageAuditEntry } from "@/lib/seo/types";
import { SCORE_TONE, scoreColor } from "@/lib/seo/constants";

type Row = {
  id: string;
  route: string;
  title: string | null;
  seoScore: number;
  geoScore: number;
  aeoScore: number;
  seoColor: "red" | "orange" | "yellow" | "green";
  geoColor: "red" | "orange" | "yellow" | "green";
  aeoColor: "red" | "orange" | "yellow" | "green";
  schemas: string[];
  inSitemap: boolean;
  issueCount: number;
};

function ScoreBadge({ score, color }: { score: number; color: "red" | "orange" | "yellow" | "green" }) {
  return <StatusBadge tone={SCORE_TONE[color]}>{score}%</StatusBadge>;
}

function toRow(p: PageAuditEntry): Row {
  return {
    id: p.entry.route,
    route: p.entry.route,
    title: p.analysis.title,
    seoScore: p.scores.seo.score,
    geoScore: p.scores.geo.score,
    aeoScore: p.scores.aeo.score,
    seoColor: scoreColor(p.scores.seo.score),
    geoColor: scoreColor(p.scores.geo.score),
    aeoColor: scoreColor(p.scores.aeo.score),
    schemas: p.analysis.schemas,
    inSitemap: p.entry.inSitemap,
    issueCount: p.scores.checks.filter((c) => !c.passed).length,
  };
}

const columns: Column<Row>[] = [
  {
    key: "route",
    header: "Route",
    sortValue: (r) => r.route,
    cell: (r) => (
      <Link
        href={`/admin/seo/pages/${encodeURIComponent(r.route.slice(1) || "home")}`}
        className="font-medium text-admin-text hover:text-admin-accent"
      >
        {r.route}
      </Link>
    ),
  },
  {
    key: "title",
    header: "Title",
    sortValue: (r) => r.title ?? "",
    cell: (r) => (
      <span className="text-admin-text-muted">{r.title ?? "—"}</span>
    ),
    hideable: true,
  },
  {
    key: "seo",
    header: "SEO",
    sortValue: (r) => r.seoScore,
    cell: (r) => <ScoreBadge score={r.seoScore} color={r.seoColor} />,
  },
  {
    key: "geo",
    header: "GEO",
    sortValue: (r) => r.geoScore,
    cell: (r) => <ScoreBadge score={r.geoScore} color={r.geoColor} />,
  },
  {
    key: "aeo",
    header: "AEO",
    sortValue: (r) => r.aeoScore,
    cell: (r) => <ScoreBadge score={r.aeoScore} color={r.aeoColor} />,
  },
  {
    key: "schema",
    header: "Schema",
    cell: (r) => (
      <span className="text-admin-text-muted">
        {r.schemas.length > 0 ? r.schemas.join(", ") : "None"}
      </span>
    ),
    hideable: true,
  },
  {
    key: "sitemap",
    header: "Sitemap",
    cell: (r) => (
      <StatusBadge tone={r.inSitemap ? "success" : "danger"}>
        {r.inSitemap ? "Yes" : "No"}
      </StatusBadge>
    ),
  },
  {
    key: "issues",
    header: "Issues",
    sortValue: (r) => r.issueCount,
    cell: (r) => (
      <span className={r.issueCount > 0 ? "font-medium text-admin-text" : "text-admin-text-muted"}>
        {r.issueCount}
      </span>
    ),
  },
];

export function PagesTable({ pages }: { pages: PageAuditEntry[] }) {
  const rows = pages.map(toRow);
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.route} ${r.title ?? ""}`}
      searchPlaceholder="Search pages..."
      initialSort={{ key: "issues", dir: "desc" }}
      emptyTitle="No pages found"
      emptyDescription="No public pages were discovered."
    />
  );
}
```

- [ ] **Step 2: Create the server page component**

Create `src/app/admin/seo/pages/page.tsx`:

```tsx
import { PageHeader } from "@/components/admin";
import { runFullAudit } from "@/lib/seo/audit";
import { PagesTable } from "./pages-table";

export const dynamic = "force-dynamic";

export default async function AdminSeoPagesPage() {
  const audit = await runFullAudit();
  const publicPages = audit.pages.filter((p) => !p.entry.isPrivate);
  return (
    <div>
      <PageHeader
        title="SEO Pages"
        description={`${publicPages.length} public pages. Sort by score or issues to find what needs attention.`}
      />
      <PagesTable pages={publicPages} />
    </div>
  );
}
```

- [ ] **Step 3: Verify page renders in browser**

Navigate to `/admin/seo/pages`. Verify:
- DataTable shows all public pages
- Sorting works on Score and Issues columns
- Search filters by route and title
- Route links point to detail pages
- Score badges show correct colors

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/seo/pages/page.tsx src/app/admin/seo/pages/pages-table.tsx
git commit -m "feat(seo): pages list with DataTable — scores, schemas, issues"
```

---

### Task 8: Page Detail (`/admin/seo/pages/[page]`)

**Files:**
- Create: `src/app/admin/seo/pages/[page]/page.tsx`
- Create: `src/app/admin/seo/pages/[page]/page-detail.tsx`

**Interfaces:**
- Consumes: `auditSinglePage()` from `audit.ts`, `PageAuditEntry`, `CheckResult` from `types.ts`, `SCORE_TONE`, `SCHEMA_DISPLAY_NAMES` from `constants.ts`
- Produces: Detail route at `/admin/seo/pages/[page]`

- [ ] **Step 1: Create the detail client component**

Create `src/app/admin/seo/pages/[page]/page-detail.tsx`:

```tsx
"use client";

import { AdminCard, StatusBadge } from "@/components/admin";
import type { PageAuditEntry, CheckResult, ScoreBreakdown } from "@/lib/seo/types";
import { SCORE_TONE, scoreColor } from "@/lib/seo/constants";

function ScoreCard({ label, breakdown }: { label: string; breakdown: ScoreBreakdown }) {
  const color = scoreColor(breakdown.score);
  return (
    <AdminCard>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">{label}</h3>
        <StatusBadge tone={SCORE_TONE[color]}>{breakdown.score}%</StatusBadge>
      </div>
      <p className="mt-2 text-2xl font-bold text-admin-text">{breakdown.passed.length}/{breakdown.passed.length + breakdown.failed.length}</p>
      <p className="text-xs text-admin-text-muted">checks passed</p>
    </AdminCard>
  );
}

function CharCount({ value, min, max }: { value: number; min: number; max: number }) {
  const inRange = value >= min && value <= max;
  return (
    <span className={inRange ? "text-admin-success" : "text-admin-danger"}>
      {value} chars {inRange ? `(good: ${min}-${max})` : `(target: ${min}-${max})`}
    </span>
  );
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-admin-border py-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">{label}</span>
      <div className="text-sm text-admin-text">{children}</div>
    </div>
  );
}

function RecommendationCard({ check }: { check: CheckResult }) {
  const priorityTone = check.priority === "high" ? "danger" : check.priority === "medium" ? "warning" : "neutral";
  return (
    <div className="flex items-center justify-between border-b border-admin-border py-3 last:border-0">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-admin-text">{check.label}</span>
        <div className="flex gap-1.5">
          <StatusBadge tone="neutral">{check.category.toUpperCase()}</StatusBadge>
          <StatusBadge tone={priorityTone}>{check.priority}</StatusBadge>
        </div>
      </div>
    </div>
  );
}

export function PageDetail({ data }: { data: PageAuditEntry }) {
  const { entry, analysis, scores } = data;
  const failedChecks = scores.checks
    .filter((c) => !c.passed)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScoreCard label="SEO Score" breakdown={scores.seo} />
        <ScoreCard label="GEO Score" breakdown={scores.geo} />
        <ScoreCard label="AEO Score" breakdown={scores.aeo} />
      </div>

      {/* Metadata */}
      <AdminCard>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
          Metadata
        </h2>
        <MetadataRow label="Title">
          {analysis.title ?? <span className="italic text-admin-text-muted">Not set</span>}
          {analysis.title && (
            <span className="ml-2 text-xs">
              <CharCount value={analysis.titleLength} min={30} max={60} />
            </span>
          )}
        </MetadataRow>
        <MetadataRow label="Description">
          {analysis.description ?? <span className="italic text-admin-text-muted">Not set (or dynamic)</span>}
          {analysis.description && (
            <span className="ml-2 text-xs">
              <CharCount value={analysis.descriptionLength} min={120} max={160} />
            </span>
          )}
        </MetadataRow>
        <MetadataRow label="Metadata Source">
          <StatusBadge tone={analysis.metadataSource === "none" ? "danger" : "success"}>
            {analysis.metadataSource}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Canonical">
          <StatusBadge tone={analysis.hasCanonical ? "success" : "danger"}>
            {analysis.hasCanonical ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Robots">
          <span className="flex gap-2">
            <StatusBadge tone={analysis.robotsIndex ? "success" : "danger"}>
              {analysis.robotsIndex ? "Index" : "NoIndex"}
            </StatusBadge>
            <StatusBadge tone={analysis.robotsFollow ? "success" : "danger"}>
              {analysis.robotsFollow ? "Follow" : "NoFollow"}
            </StatusBadge>
          </span>
        </MetadataRow>
        <MetadataRow label="Open Graph">
          <StatusBadge tone={analysis.hasOgTags ? "success" : "danger"}>
            {analysis.hasOgTags ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Twitter Card">
          <StatusBadge tone={analysis.hasTwitterCard ? "success" : "danger"}>
            {analysis.hasTwitterCard ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="OG Image">
          <StatusBadge
            tone={analysis.ogImageSource === "dedicated" ? "success" : analysis.ogImageSource === "root-fallback" ? "warning" : "danger"}
          >
            {analysis.ogImageSource}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Schemas">
          {analysis.schemas.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {analysis.schemas.map((s) => (
                <StatusBadge key={s} tone="info">{s}</StatusBadge>
              ))}
            </span>
          ) : (
            <StatusBadge tone="danger">None</StatusBadge>
          )}
        </MetadataRow>
        <MetadataRow label="In Sitemap">
          <StatusBadge tone={entry.inSitemap ? "success" : "danger"}>
            {entry.inSitemap ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
      </AdminCard>

      {/* Content Analysis */}
      <AdminCard>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
          Content Analysis
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-admin-text-muted">H1</p>
            <p className="text-lg font-bold text-admin-text">{analysis.h1Count}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">H2</p>
            <p className="text-lg font-bold text-admin-text">{analysis.h2Count}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">H3</p>
            <p className="text-lg font-bold text-admin-text">{analysis.h3Count}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Word Count</p>
            <p className="text-lg font-bold text-admin-text">{analysis.wordCount}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Reading Time</p>
            <p className="text-lg font-bold text-admin-text">{analysis.readingTime} min</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Internal Links</p>
            <p className="text-lg font-bold text-admin-text">{analysis.internalLinks}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">External Links</p>
            <p className="text-lg font-bold text-admin-text">{analysis.externalLinks}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Images</p>
            <p className="text-lg font-bold text-admin-text">
              {analysis.imageCount}
              {analysis.missingAltCount > 0 && (
                <span className="ml-1 text-sm text-admin-danger">({analysis.missingAltCount} missing alt)</span>
              )}
            </p>
          </div>
        </div>
      </AdminCard>

      {/* Recommendations */}
      {failedChecks.length > 0 && (
        <AdminCard>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
            Recommendations ({failedChecks.length})
          </h2>
          {failedChecks.map((check) => (
            <RecommendationCard key={check.id} check={check} />
          ))}
        </AdminCard>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the server page component**

Create `src/app/admin/seo/pages/[page]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { auditSinglePage } from "@/lib/seo/audit";
import { PageDetail } from "./page-detail";

export const dynamic = "force-dynamic";

export default async function AdminSeoPageDetail({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const route = `/${decodeURIComponent(page === "home" ? "" : page)}`;
  const data = await auditSinglePage(route);
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={route}
        description={`SEO: ${data.scores.seo.score}% | GEO: ${data.scores.geo.score}% | AEO: ${data.scores.aeo.score}%`}
      />
      <PageDetail data={data} />
    </div>
  );
}
```

- [ ] **Step 3: Verify page renders in browser**

Navigate to `/admin/seo/pages/about`. Verify:
- Three score cards display with correct colors
- Metadata panel shows all fields with status badges
- Content analysis grid shows heading/word/link/image counts
- Recommendations list shows failed checks sorted by priority

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/seo/pages/[page]/page.tsx src/app/admin/seo/pages/[page]/page-detail.tsx
git commit -m "feat(seo): page detail view — scores, metadata, content analysis, recommendations"
```

---

### Task 9: Sidebar Navigation + Final Integration

**Files:**
- Modify: `src/components/admin/layout/nav-config.tsx`

**Interfaces:**
- Consumes: `AdminNavGroup` type, `ADMIN_NAV` array from `nav-config.tsx`
- Produces: SEO section in admin sidebar navigation

- [ ] **Step 1: Add SEO nav group to ADMIN_NAV**

In `src/components/admin/layout/nav-config.tsx`, add the `Search` and `FileText` icons to the import:

Change the lucide-react import line to add `Search`:

```ts
import {
  LayoutDashboard, FileText, Megaphone, Layers, FolderGit2, Package, Wrench,
  Quote, Users, Mail, CreditCard, Share2, Link2, Plug, Image as ImageIcon, Gamepad2, Search, type LucideIcon,
} from "lucide-react";
```

Then add a new group to the `ADMIN_NAV` array, after the "Distribution" group:

```ts
  {
    heading: "SEO",
    items: [
      { label: "Dashboard", href: "/admin/seo", icon: Search },
      { label: "Pages", href: "/admin/seo/pages", icon: FileText },
    ],
  },
```

Note: `FileText` is already imported. Only `Search` needs adding.

- [ ] **Step 2: Verify sidebar shows SEO section**

Navigate to `/admin/seo`. Verify:
- Sidebar shows "SEO" heading with "Dashboard" and "Pages" links
- Dashboard link is active when on `/admin/seo`
- Pages link is active when on `/admin/seo/pages` or `/admin/seo/pages/*`
- Breadcrumbs in header resolve correctly

- [ ] **Step 3: End-to-end smoke test**

Walk through the full flow:
1. `/admin/seo` → Dashboard loads with KPIs, score distribution, top issues
2. Click "View All Pages" → `/admin/seo/pages` loads with DataTable
3. Search for "about" → filters to `/about` row
4. Click `/about` row → `/admin/seo/pages/about` loads with full detail
5. Verify score cards, metadata panel, content analysis, recommendations all render
6. Navigate back via sidebar "Dashboard" link

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/layout/nav-config.tsx
git commit -m "feat(seo): add SEO section to admin sidebar navigation"
```

---

### Task 10: Auto-Updating Sitemap

**Files:**
- Modify: `src/app/sitemap.ts`
- Test: `src/lib/seo/discovery.test.ts` (add sitemap test)

**Interfaces:**
- Consumes: `discoverPages()` from `discovery.ts`, data sources from `src/lib/data/*.ts`
- Produces: `sitemap()` that auto-discovers all public pages — no hardcoded static list

The current `sitemap.ts` has a hardcoded `staticPaths` array. New static pages require manual addition. Replace with filesystem discovery so any new `page.tsx` automatically appears in `sitemap.xml`.

- [ ] **Step 1: Read current sitemap.ts**

Read `src/app/sitemap.ts` to understand current structure.

- [ ] **Step 2: Rewrite sitemap.ts to use discovery**

Replace `src/app/sitemap.ts` with:

```ts
import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { discoverPages } from "@/lib/seo/discovery";
import { posts } from "@/lib/data/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const now = new Date();
  const pages = await discoverPages();

  const postDateMap = new Map(posts.map((p) => [`/blog/${p.category}/${p.slug}`, new Date(p.date)]));

  const HIGH_PRIORITY_PREFIXES = ["/blog", "/services", "/case-studies"];
  const WEEKLY_PATHS = new Set(["/", "/blog"]);

  return pages
    .filter((p) => !p.isPrivate && !p.route.includes("["))
    .map((p) => ({
      url: `${base}${p.route === "/" ? "" : p.route}`,
      lastModified: postDateMap.get(p.route) ?? now,
      changeFrequency: (WEEKLY_PATHS.has(p.route) ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
      priority: p.route === "/"
        ? 1
        : HIGH_PRIORITY_PREFIXES.some((prefix) => p.route.startsWith(prefix))
          ? 0.8
          : 0.7,
    }));
}
```

Key changes:
- Uses `discoverPages()` instead of hardcoded list
- Filters out private pages and unexpanded dynamic templates
- Preserves per-post `lastModified` from post dates
- Assigns priority/frequency based on route patterns
- Function is now `async` (discovery uses filesystem)

- [ ] **Step 3: Add test for sitemap coverage**

Add to `src/lib/seo/discovery.test.ts`:

```ts
describe("sitemap auto-discovery", () => {
  it("discoverPages includes all pages that should be in sitemap", async () => {
    const pages = await discoverPages();
    const publicRoutes = pages
      .filter((p) => !p.isPrivate && !p.route.includes("["))
      .map((p) => p.route);
    // Key pages must be present
    expect(publicRoutes).toContain("/");
    expect(publicRoutes).toContain("/about");
    expect(publicRoutes).toContain("/blog");
    expect(publicRoutes).toContain("/services");
    expect(publicRoutes).toContain("/contact");
    expect(publicRoutes).toContain("/faq");
    // Games and other newer pages auto-discovered
    expect(publicRoutes).toContain("/games");
    expect(publicRoutes).toContain("/photos");
    expect(publicRoutes).toContain("/link");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/seo/discovery.test.ts`
Expected: All tests PASS including new sitemap coverage test

- [ ] **Step 5: Verify sitemap.xml in browser**

Start dev server, navigate to `/sitemap.xml`. Verify:
- All public pages present (including `/games`, `/photos`, `/link` which were previously missing)
- No admin/private pages appear
- Blog posts have correct dates
- No `[slug]` template routes appear

- [ ] **Step 6: Commit**

```bash
git add src/app/sitemap.ts src/lib/seo/discovery.test.ts
git commit -m "feat(seo): auto-updating sitemap — filesystem discovery replaces hardcoded paths"
```

---

### Task 11: Create PR Branch & Open Pull Request

**Files:** None (git operations only)

- [ ] **Step 1: Create feature branch and push**

All commits from Tasks 1-9 should be on a feature branch. If not already on one, create and cherry-pick:

```bash
git checkout -b feat/admin-seo-dashboard origin/main
```

Then push:

```bash
git push -u origin feat/admin-seo-dashboard
```

- [ ] **Step 2: Open pull request**

```bash
gh pr create --title "feat(admin): SEO/GEO/AEO audit dashboard (Phase 1)" --body "$(cat <<'EOF'
## Summary

- Adds read-only SEO audit dashboard at `/admin/seo` with auto-discovery of all public pages
- Filesystem scan finds every `page.tsx`, expands dynamic routes from existing data sources
- Source-level analysis extracts metadata, JSON-LD schemas, OG images, heading structure, links, images
- Checklist-based scoring: SEO (12 checks), GEO (10 checks), AEO (8 checks)
- Dashboard with KPI widgets, score distribution, top issues
- Sortable/searchable page list with DataTable
- Per-page detail view: score cards, metadata panel, content analysis, recommendations

## New files
- `src/lib/seo/` — types, constants, discovery, analyzer, scoring, audit orchestrator
- `src/app/admin/seo/` — dashboard, pages list, page detail
- Tests: discovery, analyzer, scoring, audit

## Modified files
- `src/components/admin/layout/nav-config.tsx` — added SEO nav group
- `src/app/sitemap.ts` — auto-discovers pages via filesystem scan (replaces hardcoded list)

## Test plan
- [ ] `npx vitest run src/lib/seo/` — all tests pass
- [ ] Navigate to `/admin/seo` — dashboard renders with correct KPIs
- [ ] Navigate to `/admin/seo/pages` — DataTable shows all public pages
- [ ] Click a page row — detail view shows scores, metadata, content analysis
- [ ] Search and sort work in pages table
- [ ] Sidebar shows SEO section with active state

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
