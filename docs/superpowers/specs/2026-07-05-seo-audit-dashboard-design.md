# SEO Audit Dashboard — Phase 1 Design Spec

**Date:** 2026-07-05
**Status:** Approved
**Scope:** Read-only SEO/GEO/AEO audit dashboard inside admin panel

---

## Overview

A read-only audit dashboard at `/admin/seo` that auto-discovers every public page on the site, analyzes metadata/schema/content from source files, and produces SEO/GEO/AEO scores with actionable recommendations. No database tables, no page editing — pure static analysis.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Discovery | Filesystem scan of `src/app/` | Catches all pages including ones missing from sitemap |
| Routing | `/admin/seo/*` | Behind admin auth, consistent with admin panel |
| Analysis depth | Full content analysis | Metadata + schema + headings + links + images + alt text |
| Scoring | Checklist-based percentages | Honest, actionable, no fake algorithmic numbers |
| Architecture | Build-time static analysis (Approach A) | 90% accuracy, 10% complexity of runtime fetching |

---

## 1. Page Discovery Engine

**Module:** `src/lib/seo/discovery.ts`

Scans `src/app/` filesystem to find all `page.tsx` files. Converts file paths to route paths using Next.js App Router conventions:

- `src/app/about/page.tsx` → `/about`
- `src/app/blog/[category]/[slug]/page.tsx` → `/blog/[category]/[slug]`
- Route groups like `(public)` are stripped from path
- Admin/dashboard/login/settings pages detected and flagged as private

For dynamic routes (`[slug]`, `[id]`), queries the same data sources used by `sitemap.ts` to enumerate concrete instances:

- `posts` → all `/blog/[category]/[slug]` entries
- `services` → all `/services/[slug]` entries
- `products` → all `/products/[slug]` entries
- `caseStudies` → all `/case-studies/[slug]` entries
- `tools` → all `/tools/[slug]` entries
- `blogCategories` → all `/blog/[category]` entries
- Game puzzles (alfazy, hit-and-blow) → queried from Supabase `puzzles` table if available, otherwise template routes shown as-is without enumeration
- Support update codes → queried from Supabase if available, otherwise template shown

Dynamic routes that cannot be enumerated (no known data source) are listed as their template form (e.g., `/games/alfazy/[puzzle]`) with a note that concrete instances aren't counted.

Each discovered page produces a `PageEntry`:

```ts
type PageEntry = {
  route: string;        // "/about", "/blog/seo/keyword-research"
  filePath: string;     // "src/app/about/page.tsx"
  isDynamic: boolean;   // has [param] segments in original path
  isPrivate: boolean;   // admin, dashboard, login, settings, etc.
  inSitemap: boolean;   // cross-checked against sitemap.ts paths
};
```

Pages present in filesystem but absent from sitemap are flagged as an issue.

---

## 2. Metadata & Schema Analyzer

**Module:** `src/lib/seo/analyzer.ts`

Reads each page's source file and extracts information via regex/pattern matching.

### Metadata Detection

- `buildMetadata()` call → extracts title, description, path, type, noIndex arguments
- Raw `export const metadata` → parses object literal fields
- `generateMetadata` function → flags as "dynamic metadata", notes which fields are set
- No metadata export → flagged as missing

### Schema Detection

Scans for `JsonLd` component usage and which schema builder functions are imported/called:

- `articleSchema`, `breadcrumbSchema`, `faqSchema`, `serviceSchema`, `productSchema`
- `reviewSchema`, `profilePageSchema`, `organizationSchema`, `websiteSchema`, `speakingServiceSchema`

Flags: missing breadcrumbs, no schema at all.

### OG Image Detection

- Checks for `opengraph-image.tsx` in same directory as page
- Falls back check for root `/opengraph-image.tsx`
- Reports: "dedicated" | "root-fallback" | "none"

### Content Analysis

Pattern matching on JSX source text:

- **Headings:** regex for `<h1`, `<h2`, `<h3` tags and component equivalents
- **Word count:** strip JSX tags, count words in string literals (approximate)
- **Reading time:** word count / 200 wpm
- **Internal links:** count `href="/` and `Link href="/` patterns
- **External links:** count `href="http` patterns
- **Images:** count `<img`, `<Image`, `<CldImage` tags
- **Missing alt text:** images without `alt=` attribute

### Result Type

```ts
type PageAnalysis = {
  hasMetadata: boolean;
  metadataSource: "buildMetadata" | "static-export" | "generateMetadata" | "none";
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  robotsIndex: boolean;
  robotsFollow: boolean;

  schemas: string[];          // ["breadcrumb", "article", "faq"]
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
```

---

## 3. Scoring System

**Module:** `src/lib/seo/scoring.ts`

Each score = percentage of checks passed. Color thresholds:

| Range | Color |
|-------|-------|
| 0–49 | Red |
| 50–69 | Orange |
| 70–84 | Yellow |
| 85–100 | Green |

### SEO Score (12 checks)

1. Has title
2. Title length 30–60 chars
3. Has description
4. Description length 120–160 chars
5. Has canonical URL
6. Has OG tags
7. Has Twitter card
8. Has dedicated OG image (not root fallback)
9. Has breadcrumb schema
10. Has at least one H1
11. No more than one H1
12. In sitemap

### GEO Score (10 checks)

1. Has structured data (any JSON-LD)
2. Has author/person schema linked
3. Has FAQ schema
4. Has breadcrumbs (helps LLM context)
5. Description is present (LLM snippet source)
6. Has entity-relevant schema (Article/Service/Product matching page type)
7. Word count > 300 (enough for LLM to reference)
8. Has internal links > 2 (topical authority signal)
9. Content type schema matches page type
10. In sitemap (crawlable by AI engines)

### AEO Score (8 checks)

1. Has FAQ schema (direct answer extraction)
2. Has breadcrumbs (context hierarchy)
3. Has structured headings (H1 + H2s)
4. Word count > 200 (answerable content)
5. Has description (snippet candidate)
6. Has at least one list/table pattern in source
7. H2 count >= 2 (scannable structure)
8. Has schema.org markup (any type)

### Overall Score

Weighted average: SEO 50% + GEO 30% + AEO 20%.

### Result Type

```ts
type PageScores = {
  seo: { score: number; passed: string[]; failed: string[] };
  geo: { score: number; passed: string[]; failed: string[] };
  aeo: { score: number; passed: string[]; failed: string[] };
  overall: number;
  color: "red" | "orange" | "yellow" | "green";
};
```

Failed checks become actionable recommendations on page detail view.

---

## 4. Routes & UI

### `/admin/seo` — Dashboard

Server component, `force-dynamic`. Follows existing admin dashboard pattern (PageHeader + KPI grid + sections).

**KPI row** (responsive grid, 2→8 columns):

| Metric | Value |
|--------|-------|
| Total Pages | Count of all public pages |
| Indexed | Pages with index=true + in sitemap |
| Not Indexed | Pages with noIndex or missing from sitemap |
| Missing Metadata | Pages with no metadata export |
| Missing Schema | Pages with no JSON-LD |
| Missing OG Image | Pages without dedicated OG image |
| Avg SEO Score | Mean across all public pages |
| Avg GEO Score | Mean across all public pages |

**Issues summary** — top issues sorted by frequency:
- "12 pages missing breadcrumb schema"
- "6 pages not in sitemap"
- etc.

**Score distribution** — counts per color band (green/yellow/orange/red).

**Quick link** — "View all pages" button → `/admin/seo/pages`.

### `/admin/seo/pages` — Page List

Server component + client DataTable.

**Columns:**

| Column | Sortable | Content |
|--------|----------|---------|
| Route | Yes | Link to detail page |
| Title | Yes | From metadata, "—" if missing |
| SEO | Yes | Score badge with color |
| GEO | Yes | Score badge with color |
| AEO | Yes | Score badge with color |
| Schema | No | Comma-joined list or "None" |
| Sitemap | No | StatusBadge green/red |
| Issues | Yes | Count of failed checks |

Searchable by route + title. Default sort by Issues descending (worst first).

### `/admin/seo/pages/[page]` — Page Detail

Route param uses `encodeURIComponent` on the full path (e.g., `about`, `blog%2Fseo%2Fkeyword-research`). Decoded server-side with `decodeURIComponent`. No custom separator needed.

Server component + client detail component.

**Section 1 — Score cards:**
Three side-by-side cards for SEO / GEO / AEO. Each shows percentage, color, passed/total count.

**Section 2 — Metadata panel:**
- Title with character count indicator (green 30-60, red outside)
- Description with character count indicator (green 120-160, red outside)
- Canonical URL
- Robots index/follow status
- OG image status
- Twitter card status
- Schemas present (badge list)
- Breadcrumb path

**Section 3 — Content analysis:**
- Heading structure: H1 count, H2 count, H3 count
- Word count + reading time
- Internal links / External links
- Images total / Missing alt text count

**Section 4 — Recommendations:**
List of failed checks as cards. Each shows:
- What to fix ("Add breadcrumb schema")
- Which scores it affects (SEO, GEO, AEO badges)
- Priority: high (affects multiple scores) / medium / low

---

## 5. File Structure

```
src/
├── lib/seo/
│   ├── types.ts            # PageEntry, PageAnalysis, PageScores, AuditResult
│   ├── discovery.ts        # Filesystem scan → PageEntry[]
│   ├── analyzer.ts         # Source parsing → PageAnalysis per page
│   ├── scoring.ts          # Checks → PageScores per page
│   └── audit.ts            # Orchestrator: discover + analyze + score
│
├── app/admin/seo/
│   ├── page.tsx            # Dashboard server component
│   ├── seo-dashboard.tsx   # Dashboard client component
│   ├── pages/
│   │   ├── page.tsx        # Page list server component
│   │   ├── pages-table.tsx # DataTable client component
│   │   └── [page]/
│   │       ├── page.tsx    # Detail server component
│   │       └── page-detail.tsx  # Detail client component
```

---

## 6. Sidebar Navigation

Add to `nav-config.tsx` ADMIN_NAV array:

```ts
{
  heading: "SEO",
  items: [
    { label: "Dashboard", href: "/admin/seo", icon: Search },
    { label: "Pages", href: "/admin/seo/pages", icon: FileText },
  ],
}
```

---

## 7. Constraints & Non-Goals

**In scope:**
- Read-only analysis of all public pages
- SEO/GEO/AEO scoring with checklist methodology
- Recommendations derived from failed checks
- Admin-only access via existing auth

**Out of scope (Phase 1):**
- Editing metadata from admin UI
- Database storage of overrides or history
- Runtime page fetching / rendered HTML analysis
- Caching layer
- Background jobs
- External integrations (GSC, Ahrefs, etc.)
- Bulk AI-generated metadata
- Performance/accessibility scoring (use Lighthouse)

**No existing code modified** except one addition to `nav-config.tsx`. All new files.

---

## 8. Dependencies

- Existing: `src/lib/seo.ts` (metadata builders, schema functions)
- Existing: `src/lib/site.ts` (site config)
- Existing: `src/app/sitemap.ts` (cross-reference for inSitemap check)
- Existing: Data sources — `posts`, `services`, `products`, `caseStudies`, `tools`, `blogCategories`
- Existing: Admin components — `PageHeader`, `DataTable`, `KPIWidget`, `StatusBadge`, `AdminButton`
- Node.js `fs` + `path` for filesystem scanning (server-side only)
