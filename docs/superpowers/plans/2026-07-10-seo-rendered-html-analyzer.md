# SEO Rendered-HTML Analyzer Implementation Plan (PR 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/admin/seo/pages` measure each route's rendered HTML instead of its `page.tsx` source, so the scores stop reporting ~570 measurement artifacts as page defects.

**Architecture:** Two new pure-ish modules replace source scraping. `fetch-html.ts` retrieves a route's rendered HTML by fetching the app's own origin (derived from request headers, so dev hits localhost and prod hits the deployed host). `parse-html.ts` is a pure `(html) => PageAnalysis` function using regex over rendered markup. `analyzer.ts` shrinks to `fetch → parse`. When a fetch fails the analysis is `null` and the page is surfaced as "Could not fetch" rather than scored zero.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-07-10-seo-entity-and-audit-accuracy-design.md` — this plan implements §6 and the PR 1 row of §12 only.

## Global Constraints

- **No new production dependencies.** `jsdom` stays a devDependency. HTML parsing is regex-based. (Spec §3)
- **Body metrics are scoped to the main region**: from `<main id="main"` through the **last** `</main>` in the document. `app/games/layout.tsx`, `app/community/layout.tsx`, and `components/members/shell.tsx` each render a nested `<main>`; a lazy match closes the region at the inner tag. (Spec §6.2)
- **`getRenderedHtml` never throws.** Non-2xx, timeout, and network errors all return `null`. (Spec §6.1)
- **Fetch concurrency capped at 6; 10 s timeout per route.** (Spec §6.1)
- **A `null` analysis must never be scored as `0`.** It is excluded from averages and from `issuesByType`. (Spec §6.4)
- **JSON-LD `@type` collection is top-level only** — top-level objects, array members, and `@graph` members. Nested entities (`author`, `provider`, `mainEntity`) are attributes of a node, not page-level entities, and are not walked.
- **Before Task 1**, create the working branch from `origin/main`, not from the spec branch:
  `git fetch origin && git checkout -b feat/seo-rendered-html-analyzer origin/main`
  Confirm `git log --oneline origin/main..HEAD` is empty before the first commit. Other Claude sessions share this working tree, so `HEAD` may have moved.
- Never commit to `main` directly. One PR for this plan.
- Do not deploy. Deployment is gated on explicit instruction.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Verify builds by `next build`'s **own exit code**. Piping masks it.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/seo/parse-html.ts` (create) | Pure `(html) => PageAnalysis`. No I/O. |
| `src/lib/seo/parse-html.test.ts` (create) | Fixture-driven contract for the parser. |
| `src/lib/seo/fetch-html.ts` (create) | Origin resolution, cached fetch, bounded concurrency. |
| `src/lib/seo/fetch-html.test.ts` (create) | Covers `mapWithConcurrency` only. |
| `src/lib/seo/types.ts` (modify) | `PageAnalysis` reshaped; `analysis`/`scores` become nullable. |
| `src/lib/seo/analyzer.ts` (rewrite) | Shrinks to `fetch → parse`. Loses `fs`/`path`. |
| `src/lib/seo/analyzer.test.ts` (delete) | Tests source scraping, which ceases to exist. |
| `src/lib/seo/constants.ts` (modify) | Delete `SCHEMA_FUNCTIONS`, `SCHEMA_DISPLAY_NAMES`. |
| `src/lib/seo/scoring.ts` (modify) | Predicates realigned to schema.org `@type` values. |
| `src/lib/seo/scoring.test.ts` (modify) | Fixture matches the new `PageAnalysis`. |
| `src/lib/seo/audit.ts` (modify) | Null-aware aggregation; `unreachablePages` in the summary. |
| `src/app/admin/seo/pages/actions.ts` (create) | `revalidateTag("seo-audit")` server action. |
| `src/app/admin/seo/pages/pages-table.tsx` (modify) | "Could not fetch" rows; Re-run button. |
| `src/app/admin/seo/pages/[page]/page-detail.tsx` (modify) | Null-analysis state; drop the Metadata Source row. |
| `src/app/admin/seo/pages/[page]/page.tsx` (modify) | Handle a null `scores` in the header. |

**Not in this PR** (they belong to PR 2 per spec §12): `priority` weighting, page-type profiles, `applies` predicates, `issuesByType` keyed by `check.id`, `routes.ts`, sitemap changes, `buildMetadata` OG fields.

### Type transition

Tasks 1–4 are purely additive: they introduce `RenderedAnalysis` alongside the existing `PageAnalysis`, so the tree keeps compiling and every task ends green. Task 5 is the single breaking commit: it deletes the old `PageAnalysis`, renames `RenderedAnalysis` to `PageAnalysis`, and updates every consumer at once. That change cannot be made smaller — the old and new shapes disagree on `metadataSource`, which has no rendered-HTML equivalent.

---

### Task 1: Parse the document head

**Files:**
- Create: `src/lib/seo/parse-html.ts`
- Create: `src/lib/seo/parse-html.test.ts`
- Modify: `src/lib/seo/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseHtml(html: string): RenderedAnalysis` — in this task only the head fields are populated; body fields are placeholder zeros filled in by Tasks 2 and 3. `RenderedAnalysis` is exported from `src/lib/seo/types.ts`.

- [ ] **Step 1: Add the `RenderedAnalysis` type**

Append to `src/lib/seo/types.ts` (do **not** touch the existing `PageAnalysis` yet):

```ts
/**
 * Analysis derived from a route's rendered HTML. Replaces `PageAnalysis` in
 * Task 5; both exist transiently so the tree keeps compiling.
 */
export type RenderedAnalysis = {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  robotsIndex: boolean;
  robotsFollow: boolean;

  /** schema.org `@type` values, e.g. "BreadcrumbList", "FAQPage". */
  schemas: string[];
  hasBreadcrumbs: boolean;
  /** JSON-LD blocks that failed `JSON.parse`. */
  schemaParseErrors: number;

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
  /** `<ul>`, `<ol>`, and `<table>` elements inside the main region. */
  listCount: number;
  /** False when no `<main id="main">` was found and metrics include chrome. */
  mainRegionFound: boolean;
};
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/seo/parse-html.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseHtml } from "./parse-html";

const page = (head: string, body = "<main id=\"main\"></main>") =>
  `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;

describe("parseHtml — head", () => {
  it("extracts the title and its length", () => {
    const r = parseHtml(page("<title>SEO Consultant India</title>"));
    expect(r.title).toBe("SEO Consultant India");
    expect(r.titleLength).toBe(20);
  });

  it("returns a null title when absent", () => {
    const r = parseHtml(page(""));
    expect(r.title).toBeNull();
    expect(r.titleLength).toBe(0);
  });

  it("decodes HTML entities in the title", () => {
    const r = parseHtml(page("<title>Ads &amp; Copy</title>"));
    expect(r.title).toBe("Ads & Copy");
    expect(r.titleLength).toBe(10);
  });

  it("extracts the meta description", () => {
    const r = parseHtml(page('<meta name="description" content="Hello world">'));
    expect(r.description).toBe("Hello world");
    expect(r.descriptionLength).toBe(11);
  });

  it("detects canonical, og, and twitter tags", () => {
    const r = parseHtml(
      page(
        '<link rel="canonical" href="https://x.com/a">' +
          '<meta property="og:title" content="A">' +
          '<meta name="twitter:card" content="summary_large_image">',
      ),
    );
    expect(r.hasCanonical).toBe(true);
    expect(r.hasOgTags).toBe(true);
    expect(r.hasTwitterCard).toBe(true);
  });

  it("defaults robots to index,follow when the meta tag is absent", () => {
    const r = parseHtml(page(""));
    expect(r.robotsIndex).toBe(true);
    expect(r.robotsFollow).toBe(true);
  });

  it("reads noindex and nofollow from the robots meta tag", () => {
    const r = parseHtml(page('<meta name="robots" content="noindex, nofollow">'));
    expect(r.robotsIndex).toBe(false);
    expect(r.robotsFollow).toBe(false);
  });

  it("classifies the root opengraph-image as a root fallback", () => {
    const r = parseHtml(
      page('<meta property="og:image" content="https://shubhamdatarkar.com/opengraph-image?abc">'),
    );
    expect(r.ogImageSource).toBe("root-fallback");
  });

  it("classifies a segment opengraph-image as dedicated", () => {
    const r = parseHtml(
      page('<meta property="og:image" content="https://shubhamdatarkar.com/services/opengraph-image?abc">'),
    );
    expect(r.ogImageSource).toBe("dedicated");
  });

  it("reports no og image when the tag is absent", () => {
    expect(parseHtml(page("")).ogImageSource).toBe("none");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/parse-html.test.ts`
Expected: FAIL — `Failed to resolve import "./parse-html"`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/seo/parse-html.ts`:

```ts
import type { RenderedAnalysis } from "./types";

/**
 * Parses a route's rendered HTML into a `RenderedAnalysis`. Pure: no I/O.
 *
 * Regex over rendered markup, deliberately. `jsdom` is a devDependency
 * weighing ~10MB and would have to move into `dependencies` to run inside the
 * admin route. Rendered markup is stable enough that the fixtures in
 * parse-html.test.ts pin the contract; if this becomes a maintenance burden,
 * `linkedom` is a ~200KB drop-in.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
};

function decodeEntities(input: string): string {
  return input.replace(/&(?:amp|lt|gt|quot|nbsp|mdash|ndash|#39|#x27);/g, (m) => ENTITIES[m] ?? m);
}

function headOf(html: string): string {
  return html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
}

function metaContent(head: string, attr: "name" | "property", key: string): string | null {
  const tag = head.match(new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*>`, "i"))?.[0];
  if (!tag) return null;
  const content = tag.match(/content=(["'])([\s\S]*?)\1/i)?.[2];
  return content === undefined ? null : decodeEntities(content);
}

/** Path portion of an og:image URL, tolerating a relative value. */
function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function ogImageSourceOf(head: string): RenderedAnalysis["ogImageSource"] {
  const ogImage = metaContent(head, "property", "og:image");
  if (!ogImage) return "none";
  return pathnameOf(ogImage).startsWith("/opengraph-image") ? "root-fallback" : "dedicated";
}

export function parseHtml(html: string): RenderedAnalysis {
  const head = headOf(html);

  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = rawTitle === undefined ? null : decodeEntities(rawTitle).trim();
  const description = metaContent(head, "name", "description");
  const robots = metaContent(head, "name", "robots") ?? "";

  return {
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    hasCanonical: /<link[^>]*rel=["']canonical["'][^>]*>/i.test(head),
    hasOgTags: /<meta[^>]*property=["']og:/i.test(head),
    hasTwitterCard: /<meta[^>]*name=["']twitter:card["']/i.test(head),
    robotsIndex: !/noindex/i.test(robots),
    robotsFollow: !/nofollow/i.test(robots),

    schemas: [],
    hasBreadcrumbs: false,
    schemaParseErrors: 0,

    ogImageSource: ogImageSourceOf(head),

    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    wordCount: 0,
    readingTime: 1,
    internalLinks: 0,
    externalLinks: 0,
    imageCount: 0,
    missingAltCount: 0,
    listCount: 0,
    mainRegionFound: false,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/seo/parse-html.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 6: Confirm nothing else broke**

Run: `npm run test`
Expected: PASS — all existing suites still green (`RenderedAnalysis` is additive).

- [ ] **Step 7: Commit**

```bash
git add src/lib/seo/parse-html.ts src/lib/seo/parse-html.test.ts src/lib/seo/types.ts
git commit -m "feat(seo): parse title, meta, robots, and og:image from rendered head"
```

---

### Task 2: Extract schema.org types from JSON-LD

**Files:**
- Modify: `src/lib/seo/parse-html.ts`
- Modify: `src/lib/seo/parse-html.test.ts`

**Interfaces:**
- Consumes: `parseHtml` from Task 1.
- Produces: `parseHtml(...).schemas: string[]`, `.hasBreadcrumbs: boolean`, `.schemaParseErrors: number`.

`JsonLd` serialises with `JSON.stringify(data)` where `data` is an object **or** an array ([json-ld.tsx:10](../../../src/components/seo/json-ld.tsx)), and `reviewSchema()` returns an array — so a block's top level may be either. `@graph` containers must also be unwrapped.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/seo/parse-html.test.ts`:

```ts
const ld = (json: string) =>
  page("", `<main id="main"></main><script type="application/ld+json">${json}</script>`);

describe("parseHtml — JSON-LD", () => {
  it("collects @type from a single top-level object", () => {
    const r = parseHtml(ld('{"@context":"https://schema.org","@type":"Person","name":"S"}'));
    expect(r.schemas).toEqual(["Person"]);
  });

  it("collects @type from a top-level array", () => {
    const r = parseHtml(ld('[{"@type":"Review"},{"@type":"Review"},{"@type":"Product"}]'));
    expect(r.schemas.sort()).toEqual(["Product", "Review"]);
  });

  it("unwraps @graph containers", () => {
    const r = parseHtml(ld('{"@context":"https://schema.org","@graph":[{"@type":"Person"},{"@type":"WebSite"}]}'));
    expect(r.schemas.sort()).toEqual(["Person", "WebSite"]);
  });

  it("handles an @type that is itself an array", () => {
    const r = parseHtml(ld('{"@type":["Person","Author"]}'));
    expect(r.schemas.sort()).toEqual(["Author", "Person"]);
  });

  it("does not descend into nested entities", () => {
    const r = parseHtml(ld('{"@type":"Article","author":{"@type":"Person","name":"S"}}'));
    expect(r.schemas).toEqual(["Article"]);
  });

  it("sets hasBreadcrumbs from BreadcrumbList", () => {
    expect(parseHtml(ld('{"@type":"BreadcrumbList"}')).hasBreadcrumbs).toBe(true);
    expect(parseHtml(ld('{"@type":"Article"}')).hasBreadcrumbs).toBe(false);
  });

  it("counts malformed blocks without throwing", () => {
    const r = parseHtml(ld("{not json}"));
    expect(r.schemaParseErrors).toBe(1);
    expect(r.schemas).toEqual([]);
  });

  it("keeps parsing valid blocks after a malformed one", () => {
    const html = page(
      "",
      '<main id="main"></main>' +
        '<script type="application/ld+json">{oops}</script>' +
        '<script type="application/ld+json">{"@type":"FAQPage"}</script>',
    );
    const r = parseHtml(html);
    expect(r.schemaParseErrors).toBe(1);
    expect(r.schemas).toEqual(["FAQPage"]);
  });

  it("deduplicates repeated types", () => {
    const r = parseHtml(ld('[{"@type":"Review"},{"@type":"Review"}]'));
    expect(r.schemas).toEqual(["Review"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/parse-html.test.ts`
Expected: FAIL — `expected [] to deeply equal [ 'Person' ]`.

- [ ] **Step 3: Write the implementation**

Add above `parseHtml` in `src/lib/seo/parse-html.ts`:

```ts
const LD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Top-level nodes only: the value itself, array members, or `@graph` members.
 * Nested entities (`author`, `provider`, `mainEntity`) describe a node rather
 * than the page, so descending into them would report types the page does not
 * actually declare.
 */
function topLevelNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(topLevelNodes);
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (node["@graph"]) return topLevelNodes(node["@graph"]);
    return [node];
  }
  return [];
}

function extractSchemas(html: string): { schemas: string[]; schemaParseErrors: number } {
  const types = new Set<string>();
  let schemaParseErrors = 0;

  for (const match of html.matchAll(LD_BLOCK)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      schemaParseErrors++;
      continue;
    }
    for (const node of topLevelNodes(parsed)) {
      const type = node["@type"];
      if (typeof type === "string") types.add(type);
      else if (Array.isArray(type)) {
        for (const t of type) if (typeof t === "string") types.add(t);
      }
    }
  }

  return { schemas: [...types], schemaParseErrors };
}
```

Then inside `parseHtml`, replace the three placeholder schema lines. Add before the `return`:

```ts
  const { schemas, schemaParseErrors } = extractSchemas(html);
```

and in the returned object replace:

```ts
    schemas: [],
    hasBreadcrumbs: false,
    schemaParseErrors: 0,
```

with:

```ts
    schemas,
    hasBreadcrumbs: schemas.includes("BreadcrumbList"),
    schemaParseErrors,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/seo/parse-html.test.ts`
Expected: PASS — 18 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/parse-html.ts src/lib/seo/parse-html.test.ts
git commit -m "feat(seo): collect schema.org @type values from rendered JSON-LD"
```

---

### Task 3: Measure the main content region

**Files:**
- Modify: `src/lib/seo/parse-html.ts`
- Modify: `src/lib/seo/parse-html.test.ts`

**Interfaces:**
- Consumes: `parseHtml` from Tasks 1–2.
- Produces: `parseHtml(...)` populates `h1Count`, `h2Count`, `h3Count`, `wordCount`, `readingTime`, `internalLinks`, `externalLinks`, `imageCount`, `missingAltCount`, `listCount`, `mainRegionFound`.

This is the task that makes the whole PR worth doing. Counting links across the entire document means every page passes `geo-internal-links` on the nav bar alone, and every word count includes the footer.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/seo/parse-html.test.ts`:

```ts
const doc = (body: string) =>
  `<!DOCTYPE html><html><head><title>T</title></head><body>` +
  `<nav><a href="/about">About</a><a href="/blog">Blog</a><a href="/work">Work</a></nav>` +
  body +
  `<footer><a href="/faq">FAQ</a><p>Footer words here</p></footer>` +
  `</body></html>`;

describe("parseHtml — main region", () => {
  it("ignores links outside the main region", () => {
    const r = parseHtml(doc('<main id="main"><a href="/contact">Contact</a></main>'));
    expect(r.internalLinks).toBe(1);
    expect(r.mainRegionFound).toBe(true);
  });

  it("runs to the LAST closing main tag when layouts nest their own", () => {
    const r = parseHtml(
      doc('<main id="main"><main class="inner"><h2>Inner</h2></main><h2>Outer</h2></main>'),
    );
    expect(r.h2Count).toBe(2);
  });

  it("falls back to the body and flags mainRegionFound=false", () => {
    const r = parseHtml(doc("<div><h1>No main</h1></div>"));
    expect(r.mainRegionFound).toBe(false);
    expect(r.h1Count).toBe(1);
    expect(r.internalLinks).toBe(4); // nav 3 + footer 1
  });

  it("counts headings", () => {
    const r = parseHtml(doc('<main id="main"><h1>A</h1><h2>B</h2><h2>C</h2><h3>D</h3></main>'));
    expect(r.h1Count).toBe(1);
    expect(r.h2Count).toBe(2);
    expect(r.h3Count).toBe(1);
  });

  it("counts lists and tables", () => {
    const r = parseHtml(doc('<main id="main"><ul><li>a</li></ul><ol><li>b</li></ol><table></table></main>'));
    expect(r.listCount).toBe(3);
  });

  it("separates internal from external links", () => {
    const r = parseHtml(
      doc('<main id="main"><a href="/a">a</a><a href="https://x.com">x</a></main>'),
    );
    expect(r.internalLinks).toBe(1);
    expect(r.externalLinks).toBe(1);
  });

  it("counts images and those missing alt text", () => {
    const r = parseHtml(doc('<main id="main"><img src="a.png" alt="A"><img src="b.png"></main>'));
    expect(r.imageCount).toBe(2);
    expect(r.missingAltCount).toBe(1);
  });

  it("counts words from text only, excluding markup and scripts", () => {
    const r = parseHtml(
      doc('<main id="main"><p>one two three</p><script>var ignored = "four five";</script></main>'),
    );
    expect(r.wordCount).toBe(3);
  });

  it("derives readingTime from wordCount with a floor of 1", () => {
    const r = parseHtml(doc('<main id="main"><p>one</p></main>'));
    expect(r.readingTime).toBe(1);
  });

  it("decodes entities before counting words", () => {
    // `a&nbsp;b` is ONE whitespace-free token until &nbsp; is decoded to a space.
    const r = parseHtml(doc('<main id="main"><p>alpha&nbsp;beta</p></main>'));
    expect(r.wordCount).toBe(2);
  });

  it("does not count standalone punctuation as a word", () => {
    const r = parseHtml(doc('<main id="main"><p>Shubham Datarkar &mdash; The Kalamwala</p></main>'));
    expect(r.wordCount).toBe(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/parse-html.test.ts`
Expected: FAIL — `expected 0 to be 1` on `internalLinks`.

- [ ] **Step 3: Write the implementation**

Add above `parseHtml` in `src/lib/seo/parse-html.ts`:

```ts
/**
 * The main region runs from `<main id="main">` to the LAST `</main>` in the
 * document. The games, community, and members layouts each render a nested
 * `<main>` inside the root layout's, so a lazy match would close the region at
 * the inner tag and silently drop most of the page.
 */
function mainRegion(html: string): { region: string; found: boolean } {
  const start = html.search(/<main[^>]*id=["']main["'][^>]*>/i);
  if (start === -1) {
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1];
    return { region: body ?? html, found: false };
  }
  const end = html.lastIndexOf("</main>");
  return { region: html.slice(start, end === -1 ? html.length : end), found: true };
}

function count(source: string, pattern: RegExp): number {
  return (source.match(pattern) || []).length;
}

function countWords(region: string): number {
  const text = decodeEntities(region.replace(/<[^>]+>/g, " "));
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
```

Inside `parseHtml`, add after the `head` line:

```ts
  const { region, found } = mainRegion(html);
  const content = region.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  const images = content.match(/<img\s[^>]*>/gi) ?? [];
  const wordCount = countWords(content);
```

and replace the placeholder body fields in the returned object with:

```ts
    h1Count: count(content, /<h1[\s>]/gi),
    h2Count: count(content, /<h2[\s>]/gi),
    h3Count: count(content, /<h3[\s>]/gi),
    wordCount,
    readingTime: Math.max(1, Math.round(wordCount / 200)),
    internalLinks: count(content, /<a[^>]+href=["']\/[^"']*["']/gi),
    externalLinks: count(content, /<a[^>]+href=["']https?:\/\//gi),
    imageCount: images.length,
    missingAltCount: images.filter((tag) => !/\salt\s*=/i.test(tag)).length,
    listCount: count(content, /<(?:ul|ol|table)[\s>]/gi),
    mainRegionFound: found,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/seo/parse-html.test.ts`
Expected: PASS — 28 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/parse-html.ts src/lib/seo/parse-html.test.ts
git commit -m "feat(seo): measure headings, words, links, and lists inside <main>"
```

---

### Task 4: Fetch rendered HTML with bounded concurrency

**Files:**
- Create: `src/lib/seo/fetch-html.ts`
- Create: `src/lib/seo/fetch-html.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `getOrigin(): Promise<string>`
  - `getRenderedHtml(origin: string, route: string): Promise<string | null>`
  - `mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]>`
  - `SEO_AUDIT_TAG: "seo-audit"`

`getOrigin` and `getRenderedHtml` are not unit-tested — one reads `next/headers`, the other performs network I/O. Both are exercised by loading `/admin/seo/pages`. `mapWithConcurrency` is pure and is tested.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo/fetch-html.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./fetch-html";

describe("mapWithConcurrency", () => {
  it("preserves input order in the results", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 6, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(6);
  });

  it("handles an empty input", async () => {
    expect(await mapWithConcurrency([], 6, async () => 1)).toEqual([]);
  });

  it("handles fewer items than the limit", async () => {
    expect(await mapWithConcurrency([1], 6, async (n) => n + 1)).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/fetch-html.test.ts`
Expected: FAIL — `Failed to resolve import "./fetch-html"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/fetch-html.ts`:

```ts
import { headers } from "next/headers";

/** Cache tag; the Re-run Audit action revalidates it. */
export const SEO_AUDIT_TAG = "seo-audit";

const TIMEOUT_MS = 10_000;
const REVALIDATE_SECONDS = 3600;

/**
 * Origin of the running app, from request headers. The audit page is
 * `force-dynamic`, so headers are available. Development therefore hits
 * localhost and production hits the deployed host, with no environment
 * variable to drift out of sync.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Rendered HTML for a route, or `null` if it could not be retrieved. Never
 * throws: a null result means "unknown", which the audit surfaces as
 * "Could not fetch" rather than scoring the page zero.
 */
export async function getRenderedHtml(origin: string, route: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}${route}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: [SEO_AUDIT_TAG] },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Runs `fn` over `items` with at most `limit` in flight, preserving order.
 * A 60-way self-fetch fan-out against a single dev server wedges it.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/seo/fetch-html.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/fetch-html.ts src/lib/seo/fetch-html.test.ts
git commit -m "feat(seo): fetch rendered HTML from own origin with bounded concurrency"
```

---

### Task 5: Swap the analyzer over to rendered HTML

**Files:**
- Modify: `src/lib/seo/types.ts`
- Rewrite: `src/lib/seo/analyzer.ts`
- Delete: `src/lib/seo/analyzer.test.ts`
- Modify: `src/lib/seo/constants.ts`
- Modify: `src/lib/seo/scoring.ts`
- Modify: `src/lib/seo/scoring.test.ts`
- Modify: `src/lib/seo/audit.ts`

**Interfaces:**
- Consumes: `parseHtml` (Task 1–3); `getOrigin`, `getRenderedHtml`, `mapWithConcurrency` (Task 4).
- Produces:
  - `PageAnalysis` — the former `RenderedAnalysis`, renamed. `metadataSource`, `hasMetadata`, and the `MetadataSource` type no longer exist.
  - `analyzePage(entry: PageEntry, origin: string): Promise<PageAnalysis | null>`
  - `PageAuditEntry` — `analysis: PageAnalysis | null`, `scores: PageScores | null`
  - `AuditSummary.unreachablePages: number`

This is the single breaking commit. The old and new shapes disagree on `metadataSource`, which has no rendered-HTML equivalent: once `<title>` is read from the real document, the `|| a.metadataSource === "generateMetadata"` escape hatches in `scoring.ts` become both unnecessary and wrong — they were the reason `generateMetadata` routes auto-passed `seo-has-title` while auto-failing `seo-title-length`.

`analyzer.test.ts` is deleted rather than rewritten. Every assertion in it tests source scraping (`metadataSource === "buildMetadata"`, schemas read from function names). `parse-html.test.ts` is its replacement.

- [ ] **Step 1: Reshape the types**

In `src/lib/seo/types.ts`:

1. Delete the `MetadataSource` type and the old `PageAnalysis` type entirely.
2. Rename `RenderedAnalysis` to `PageAnalysis`.
3. Replace `PageAuditEntry` and `AuditSummary` with:

```ts
export type PageAuditEntry = {
  entry: PageEntry;
  analysis: PageAnalysis | null;
  scores: PageScores | null;
};

export type AuditSummary = {
  totalPages: number;
  indexedPages: number;
  notIndexedPages: number;
  missingMetadata: number;
  missingSchema: number;
  missingOgImage: number;
  /** Routes whose HTML could not be fetched. Excluded from every average. */
  unreachablePages: number;
  avgSeoScore: number;
  avgGeoScore: number;
  avgAeoScore: number;
  issuesByType: { label: string; count: number }[];
  colorDistribution: Record<ScoreColor, number>;
};
```

- [ ] **Step 2: Update the parser's import**

In `src/lib/seo/parse-html.ts`, change the import and the two `RenderedAnalysis` references:

```ts
import type { PageAnalysis } from "./types";
```

```ts
function ogImageSourceOf(head: string): PageAnalysis["ogImageSource"] {
```

```ts
export function parseHtml(html: string): PageAnalysis {
```

- [ ] **Step 3: Rewrite the analyzer**

Replace the entire contents of `src/lib/seo/analyzer.ts`:

```ts
import type { PageEntry, PageAnalysis } from "./types";
import { getRenderedHtml } from "./fetch-html";
import { parseHtml } from "./parse-html";

/**
 * Analyses a route by fetching and parsing its rendered HTML.
 *
 * Returns `null` when the route could not be fetched — an unexpanded dynamic
 * template such as `/community/p/[id]` is not a real URL, and a dev server may
 * be down. Callers must not treat `null` as a zero score.
 */
export async function analyzePage(
  entry: PageEntry,
  origin: string,
): Promise<PageAnalysis | null> {
  const html = await getRenderedHtml(origin, entry.route);
  return html === null ? null : parseHtml(html);
}
```

- [ ] **Step 4: Delete the obsolete test**

```bash
git rm src/lib/seo/analyzer.test.ts
```

- [ ] **Step 5: Strip the source-scraping constants**

In `src/lib/seo/constants.ts`, delete `SCHEMA_FUNCTIONS` and `SCHEMA_DISPLAY_NAMES` entirely. They have no other consumers. Keep `PRIVATE_PREFIXES`, `scoreColor`, and `SCORE_TONE` unchanged.

- [ ] **Step 6: Realign the scoring predicates to schema.org `@type`**

In `src/lib/seo/scoring.ts`, replace the three check arrays' affected entries. `schemas` now holds `@type` values (`"FAQPage"`), not scraped function names (`"faq"`).

```ts
const SEO_CHECKS: Check[] = [
  { id: "seo-has-title", label: "Has title", test: (_, a) => !!a.title, priority: "high" },
  { id: "seo-title-length", label: "Title length 30-60 chars", test: (_, a) => a.titleLength >= 30 && a.titleLength <= 60, priority: "medium" },
  { id: "seo-has-desc", label: "Has description", test: (_, a) => !!a.description, priority: "high" },
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

const ENTITY_TYPES = ["Article", "Service", "Product", "ProfilePage", "Organization"];
const SITE_WIDE_TYPES = ["Person", "WebSite", "BreadcrumbList"];

const GEO_CHECKS: Check[] = [
  { id: "geo-schema", label: "Has structured data", test: (_, a) => a.schemas.length > 0, priority: "high" },
  { id: "geo-author", label: "Has author/person schema", test: (_, a) => a.schemas.some((s) => ["ProfilePage", "Person"].includes(s)), priority: "medium" },
  { id: "geo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("FAQPage"), priority: "medium" },
  { id: "geo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "geo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0, priority: "high" },
  { id: "geo-entity-schema", label: "Has entity-relevant schema", test: (_, a) => a.schemas.some((s) => ENTITY_TYPES.includes(s)), priority: "medium" },
  { id: "geo-word-count", label: "Word count > 300", test: (_, a) => a.wordCount > 300, priority: "medium" },
  { id: "geo-internal-links", label: "Has internal links > 2", test: (_, a) => a.internalLinks > 2, priority: "low" },
  { id: "geo-content-schema", label: "Content type schema matches page", test: (_, a) => a.schemas.some((s) => !SITE_WIDE_TYPES.includes(s)), priority: "low" },
  { id: "geo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const AEO_CHECKS: Check[] = [
  { id: "aeo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("FAQPage"), priority: "high" },
  { id: "aeo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "aeo-headings", label: "Has structured headings (H1 + H2s)", test: (_, a) => a.h1Count >= 1 && a.h2Count >= 1, priority: "high" },
  { id: "aeo-word-count", label: "Word count > 200", test: (_, a) => a.wordCount > 200, priority: "medium" },
  { id: "aeo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0, priority: "medium" },
  { id: "aeo-lists", label: "Has list or table patterns", test: (_, a) => a.listCount > 0, priority: "low" },
  { id: "aeo-h2-count", label: "H2 count >= 2", test: (_, a) => a.h2Count >= 2, priority: "medium" },
  { id: "aeo-schema", label: "Has schema.org markup", test: (_, a) => a.schemas.length > 0, priority: "high" },
];
```

Three predicates changed meaning, deliberately:
- `geo-content-schema` was `schemas.length > 1`. Because the root layout emits Person + WebSite on every page, that test would now pass everywhere for free. It becomes "carries a type beyond the site-wide three".
- `aeo-lists` was `h2Count >= 2 || internalLinks > 3`, a proxy for structure. Rendered HTML lets it count real `<ul>`/`<ol>`/`<table>`.
- The four `metadataSource` escape hatches are gone.

- [ ] **Step 7: Update the scoring fixture**

In `src/lib/seo/scoring.test.ts`, replace the `goodAnalysis` fixture:

```ts
const goodAnalysis: PageAnalysis = {
  title: "Founder, Marketer & Copywriter — Shubham Datarkar",
  titleLength: 49,
  description:
    "Shubham Datarkar is a founder, marketer, and copywriter building things that make other things easier for the people who use them.",
  descriptionLength: 130,
  hasCanonical: true,
  hasOgTags: true,
  hasTwitterCard: true,
  robotsIndex: true,
  robotsFollow: true,
  schemas: ["BreadcrumbList", "ProfilePage", "Person", "WebSite"],
  hasBreadcrumbs: true,
  schemaParseErrors: 0,
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
  listCount: 2,
  mainRegionFound: true,
};
```

- [ ] **Step 8: Make the audit null-aware**

In `src/lib/seo/audit.ts`, replace `buildSummary`'s first lines and both exported functions:

```ts
import type { AuditResult, AuditSummary, PageAuditEntry, ScoreColor } from "./types";
import { discoverPages } from "./discovery";
import { analyzePage } from "./analyzer";
import { scorePage } from "./scoring";
import { getOrigin, mapWithConcurrency } from "./fetch-html";
import { getPublishedPosts } from "@/lib/blog/queries";

const FETCH_CONCURRENCY = 6;

/** A page that was fetched and parsed. Narrowed so the summary can read it. */
type ScoredPage = PageAuditEntry & {
  analysis: NonNullable<PageAuditEntry["analysis"]>;
  scores: NonNullable<PageAuditEntry["scores"]>;
};

function isScored(page: PageAuditEntry): page is ScoredPage {
  return page.analysis !== null && page.scores !== null;
}

function buildSummary(pages: PageAuditEntry[]): AuditSummary {
  const publicPages = pages.filter((p) => !p.entry.isPrivate);
  const scored = publicPages.filter(isScored);
  const unreachablePages = publicPages.length - scored.length;

  const indexed = scored.filter((p) => p.analysis.robotsIndex && p.entry.inSitemap);
  const notIndexed = scored.filter((p) => !p.analysis.robotsIndex || !p.entry.inSitemap);
  const missingMetadata = scored.filter((p) => !p.analysis.title || !p.analysis.description);
  const missingSchema = scored.filter((p) => p.analysis.schemas.length === 0);
  const missingOgImage = scored.filter((p) => p.analysis.ogImageSource !== "dedicated");

  const avg = (pick: (p: ScoredPage) => number) =>
    scored.length > 0 ? Math.round(scored.reduce((sum, p) => sum + pick(p), 0) / scored.length) : 0;

  const issueCounts = new Map<string, number>();
  for (const page of scored) {
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
  for (const page of scored) {
    colorDistribution[page.scores.color]++;
  }

  return {
    totalPages: publicPages.length,
    indexedPages: indexed.length,
    notIndexedPages: notIndexed.length,
    missingMetadata: missingMetadata.length,
    missingSchema: missingSchema.length,
    missingOgImage: missingOgImage.length,
    unreachablePages,
    avgSeoScore: avg((p) => p.scores.seo.score),
    avgGeoScore: avg((p) => p.scores.geo.score),
    avgAeoScore: avg((p) => p.scores.aeo.score),
    issuesByType,
    colorDistribution,
  };
}

export async function runFullAudit(): Promise<AuditResult> {
  const entries = await discoverPages(await getPublishedPosts());
  const origin = await getOrigin();

  const pages = await mapWithConcurrency(entries, FETCH_CONCURRENCY, async (entry) => {
    const analysis = await analyzePage(entry, origin);
    return {
      entry,
      analysis,
      scores: analysis ? scorePage(entry, analysis) : null,
    } satisfies PageAuditEntry;
  });

  return { pages, summary: buildSummary(pages) };
}

export async function auditSinglePage(route: string): Promise<PageAuditEntry | null> {
  const entries = await discoverPages(await getPublishedPosts());
  const entry = entries.find((e) => e.route === route);
  if (!entry) return null;
  const origin = await getOrigin();
  const analysis = await analyzePage(entry, origin);
  return { entry, analysis, scores: analysis ? scorePage(entry, analysis) : null };
}
```

`issuesByType` still keys on `check.label`. That is the known double-counting bug; spec §12 assigns its fix to PR 2. Do not fix it here — PR 2 changes the key to `check.id` together with the weighting work.

- [ ] **Step 9: Run the tests**

Run: `npm run test`
Expected: PASS. `analyzer.test.ts` is gone; `parse-html.test.ts`, `fetch-html.test.ts`, `scoring.test.ts`, and `seo.test.ts` all pass.

- [ ] **Step 10: Type-check**

Run: `npx tsc --noEmit`
Expected: errors **only** in `src/app/admin/seo/pages/pages-table.tsx`, `.../[page]/page-detail.tsx`, and `.../[page]/page.tsx`, all of the form "possibly null". Task 6 fixes those. Any error in `src/lib/seo/**` means this task is not done.

- [ ] **Step 11: Commit**

```bash
git add src/lib/seo/
git commit -m "feat(seo)!: analyze rendered HTML instead of page.tsx source"
```

---

### Task 6: Surface unreachable pages in the admin UI

**Files:**
- Create: `src/app/admin/seo/pages/actions.ts`
- Modify: `src/app/admin/seo/pages/pages-table.tsx`
- Modify: `src/app/admin/seo/pages/page.tsx`
- Modify: `src/app/admin/seo/pages/[page]/page-detail.tsx`
- Modify: `src/app/admin/seo/pages/[page]/page.tsx`

**Interfaces:**
- Consumes: `PageAuditEntry` with nullable `analysis`/`scores` (Task 5); `SEO_AUDIT_TAG` (Task 4).
- Produces: `rerunAudit(): Promise<void>` server action.

A page whose HTML could not be fetched must read "Could not fetch", never `0%`. Reporting `0` when the analyzer means "I do not know" is the class of bug this entire PR exists to remove.

- [ ] **Step 1: Add the Re-run Audit server action**

Create `src/app/admin/seo/pages/actions.ts`:

```ts
"use server";

import { revalidateTag } from "next/cache";
import { SEO_AUDIT_TAG } from "@/lib/seo/fetch-html";

/** Drops the cached HTML for every audited route so the next load refetches. */
export async function rerunAudit(): Promise<void> {
  revalidateTag(SEO_AUDIT_TAG);
}
```

- [ ] **Step 2: Make the table row tolerate a null analysis**

In `src/app/admin/seo/pages/pages-table.tsx`, change `Row`, `toRow`, and the score columns:

```ts
type Row = {
  id: string;
  route: string;
  title: string | null;
  reachable: boolean;
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

function toRow(p: PageAuditEntry): Row {
  const { analysis, scores } = p;
  return {
    id: p.entry.route,
    route: p.entry.route,
    title: analysis?.title ?? null,
    reachable: analysis !== null && scores !== null,
    seoScore: scores?.seo.score ?? 0,
    geoScore: scores?.geo.score ?? 0,
    aeoScore: scores?.aeo.score ?? 0,
    seoColor: scoreColor(scores?.seo.score ?? 0),
    geoColor: scoreColor(scores?.geo.score ?? 0),
    aeoColor: scoreColor(scores?.aeo.score ?? 0),
    schemas: analysis?.schemas ?? [],
    inSitemap: p.entry.inSitemap,
    issueCount: scores?.checks.filter((c) => !c.passed).length ?? 0,
  };
}
```

Replace the three score cells so an unreachable row shows a dash rather than a red `0%`:

```tsx
  {
    key: "seo",
    header: "SEO",
    sortValue: (r) => (r.reachable ? r.seoScore : -1),
    cell: (r) => (r.reachable ? <ScoreBadge score={r.seoScore} color={r.seoColor} /> : <span className="text-admin-text-muted">—</span>),
  },
  {
    key: "geo",
    header: "GEO",
    sortValue: (r) => (r.reachable ? r.geoScore : -1),
    cell: (r) => (r.reachable ? <ScoreBadge score={r.geoScore} color={r.geoColor} /> : <span className="text-admin-text-muted">—</span>),
  },
  {
    key: "aeo",
    header: "AEO",
    sortValue: (r) => (r.reachable ? r.aeoScore : -1),
    cell: (r) => (r.reachable ? <ScoreBadge score={r.aeoScore} color={r.aeoColor} /> : <span className="text-admin-text-muted">—</span>),
  },
```

And the Issues cell:

```tsx
  {
    key: "issues",
    header: "Issues",
    sortValue: (r) => (r.reachable ? r.issueCount : -1),
    cell: (r) =>
      r.reachable ? (
        <span className={r.issueCount > 0 ? "font-medium text-admin-text" : "text-admin-text-muted"}>
          {r.issueCount}
        </span>
      ) : (
        <StatusBadge tone="warning">Could not fetch</StatusBadge>
      ),
  },
```

- [ ] **Step 3: Add the Re-run Audit button**

In `src/app/admin/seo/pages/page.tsx`, replace the whole file:

```tsx
import { PageHeader } from "@/components/admin";
import { runFullAudit } from "@/lib/seo/audit";
import { PagesTable } from "./pages-table";
import { rerunAudit } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSeoPagesPage() {
  const audit = await runFullAudit();
  const publicPages = audit.pages.filter((p) => !p.entry.isPrivate);
  const { unreachablePages } = audit.summary;

  return (
    <div>
      <PageHeader
        title="SEO Pages"
        description={
          `${publicPages.length} public pages. Sort by score or issues to find what needs attention.` +
          (unreachablePages > 0 ? ` ${unreachablePages} could not be fetched.` : "")
        }
      />
      <form action={rerunAudit} className="mb-4">
        <button
          type="submit"
          className="rounded-md border border-admin-border px-3 py-1.5 text-sm text-admin-text hover:bg-admin-surface"
        >
          Re-run audit
        </button>
      </form>
      <PagesTable pages={publicPages} />
    </div>
  );
}
```

- [ ] **Step 4: Handle a null analysis on the detail page**

In `src/app/admin/seo/pages/[page]/page-detail.tsx`:

1. Change the component signature to bail out early:

```tsx
export function PageDetail({ data }: { data: PageAuditEntry }) {
  const { entry, analysis, scores } = data;

  if (!analysis || !scores) {
    return (
      <AdminCard>
        <h2 className="text-sm font-medium text-admin-text">Could not fetch {entry.route}</h2>
        <p className="mt-2 text-sm text-admin-text-muted">
          The audit fetches each route&apos;s rendered HTML. This one did not respond — it may be an
          unexpanded dynamic template, or the server may have been unreachable. Try Re-run audit.
        </p>
      </AdminCard>
    );
  }

  const failedChecks = scores.checks
```

2. Delete the entire `Metadata Source` row (lines 93–97 of the current file):

```tsx
        <MetadataRow label="Metadata Source">
          <StatusBadge tone={analysis.metadataSource === "none" ? "danger" : "success"}>
            {analysis.metadataSource}
          </StatusBadge>
        </MetadataRow>
```

`metadataSource` no longer exists — the analyzer reads rendered output and cannot know which Next.js API produced it.

3. In its place, add a row that reports parse health:

```tsx
        <MetadataRow label="Structured Data Health">
          <span className="flex gap-2">
            <StatusBadge tone={analysis.schemaParseErrors === 0 ? "success" : "danger"}>
              {analysis.schemaParseErrors === 0
                ? "All JSON-LD parsed"
                : `${analysis.schemaParseErrors} malformed block(s)`}
            </StatusBadge>
            {!analysis.mainRegionFound && (
              <StatusBadge tone="warning">No &lt;main&gt; — counts include chrome</StatusBadge>
            )}
          </span>
        </MetadataRow>
```

4. Change the `Description` row's empty state — "(or dynamic)" no longer applies, because dynamic routes are now measured from their real rendered output:

```tsx
          {analysis.description ?? <span className="italic text-admin-text-muted">Not set</span>}
```

5. Add a Lists tile to the Content Analysis grid, after the Images tile:

```tsx
          <div>
            <p className="text-xs text-admin-text-muted">Lists & Tables</p>
            <p className="text-lg font-bold text-admin-text">{analysis.listCount}</p>
          </div>
```

- [ ] **Step 5: Handle a null score in the detail header**

In `src/app/admin/seo/pages/[page]/page.tsx`, replace the `PageHeader` description:

```tsx
      <PageHeader
        title={route}
        description={
          data.scores
            ? `SEO: ${data.scores.seo.score}% | GEO: ${data.scores.geo.score}% | AEO: ${data.scores.aeo.score}%`
            : "Could not fetch this route"
        }
      />
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 7: Run the full suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 8: Verify the build by its own exit code**

Run: `npx next build; echo "exit=$LASTEXITCODE"`
Expected: `exit=0`. Do not pipe the build — piping masks the exit status.

- [ ] **Step 9: Verify against the running app**

Start the dev server, then load `/admin/seo/pages`.

Confirm, in order:
1. The table renders with non-zero word counts. Before this PR every page reported a word count under 120; `/my-story` and `/about` should now report several hundred.
2. `/about` shows `h1Count` of 1 — it is rendered by `PageHero`, and the old source analyzer reported 0.
3. Every page lists `Person` and `WebSite` among its schemas, because the root layout emits them on all routes.
4. The unexpanded dynamic templates (`/community/p/[id]`, `/members/tools/[slug]`) show "Could not fetch", not `0%`.
5. Clicking **Re-run audit** reloads with fresh data.

- [ ] **Step 10: Commit**

```bash
git add src/app/admin/seo/
git commit -m "feat(seo): surface unreachable routes and add re-run audit action"
```

- [ ] **Step 11: Open the PR**

```bash
git push -u origin feat/seo-rendered-html-analyzer
gh pr create --base main --title "feat(seo): audit reads rendered HTML" --body-file docs/superpowers/plans/2026-07-10-seo-rendered-html-analyzer.md
```

Do not merge, and do not deploy. Both are gated on explicit instruction.

---

## What this PR deliberately leaves broken

Stated plainly so a reviewer does not file them as regressions:

- **`issuesByType` still double-counts.** `"Has FAQ schema"` will still report roughly twice the page count, because the key is `check.label` and both `geo-faq` and `aeo-faq` carry that label. Fixed in PR 2.
- **`priority` is still ignored by the score.** Every check remains worth `1/n`. Fixed in PR 2.
- **FAQ schema is still demanded of every page.** 97 pages will still fail it. Fixed in PR 2 by the `applies` predicate.
- **`/games/*`, `/members/*`, `/community/*` are still scored as public content.** Fixed in PR 2 by the page-type profiles.
- **Scores will get worse for some pages, and that is correct.** `generateMetadata` routes lose the escape hatch that let them auto-pass `seo-has-title` and `seo-has-desc`. If `/products/alluminaty` drops, the new number is the true one.

## Self-Review Notes

- **Spec coverage:** This plan implements spec §6 (Phase 1) and §6.4 (failure surfacing) in full, plus the `schemas`-to-`@type` migration required by §6.3. Spec §5 (profiles), §7 (metadata plumbing), §8 (entity graph), and §9 (copy) are explicitly out of scope and are named in "What this PR deliberately leaves broken".
- **Type consistency:** `RenderedAnalysis` (Tasks 1–4) becomes `PageAnalysis` (Task 5) — the rename is a single explicit step, and every consumer is updated in the same commit. `mapWithConcurrency`, `getOrigin`, `getRenderedHtml`, and `SEO_AUDIT_TAG` are declared in Task 4 and consumed with matching signatures in Tasks 5 and 6.
- **Spec §11 test coverage** for `entities.test.ts`, `audit.test.ts`, and `routes.test.ts` belongs to later PRs; only `parse-html.test.ts` and `fetch-html.test.ts` are in scope here.
