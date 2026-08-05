# KalamAI Content Types + Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick Blog / Landing Page / Product Description so the writing engine branches structure + word band per type, always land users on the finished article, and make written content one click to find.

**Architecture:** Add `contentType` to the existing `ArticleParams` jsonb (no migration). Thread it form → articles route → the three prompt builders, which branch on it. The analysis report redirects to the finished article. Recent/History lists switch from analyses to articles.

**Tech Stack:** Next.js (App Router, RSC), TypeScript, Supabase (jsonb columns), Vitest.

## Global Constraints

- No DB migration — `params` and `meta` are existing jsonb columns on `kalamai_articles`.
- Blog behavior must be byte-identical to today (regression guard in tests).
- Every LLM call already uses `claude-sonnet-5`; do not change model wiring.
- Offline mode (`KALAMAI_FAKE_LLM=1`) must stay green.
- Word bands: Blog `[1000, 2200]`, Landing `[500, 1200]`, Product `[120, 500]`.
- Content type values: `"blog" | "landing" | "product"`, default `"blog"`.
- Run tests from repo root: `npx vitest run <path>`.

---

### Task 1: Content-type constants + `bandFor` in writing.ts

**Files:**
- Modify: `src/lib/kalamai/writing.ts` (top, near `ArticleParams`)
- Test: `src/lib/kalamai/writing.test.ts`

**Interfaces:**
- Produces:
  - `type ContentType = "blog" | "landing" | "product"`
  - `CONTENT_TYPES: readonly ContentType[]`
  - `CONTENT_LABELS: Record<ContentType, string>`
  - `bandFor(t: ContentType): [number, number]`
  - `ArticleParams` gains `contentType?: ContentType` (optional so existing callers/rows without it default to blog at read time).

- [ ] **Step 1: Write the failing test**

Add to `writing.test.ts`:

```ts
import { bandFor, CONTENT_TYPES, CONTENT_LABELS } from "./writing";

describe("content types", () => {
  it("bandFor returns the per-type word band", () => {
    expect(bandFor("blog")).toEqual([1000, 2200]);
    expect(bandFor("landing")).toEqual([500, 1200]);
    expect(bandFor("product")).toEqual([120, 500]);
  });
  it("unknown type falls back to blog band", () => {
    // @ts-expect-error deliberately wrong
    expect(bandFor("nope")).toEqual([1000, 2200]);
  });
  it("labels + list cover all three", () => {
    expect(CONTENT_TYPES).toEqual(["blog", "landing", "product"]);
    expect(CONTENT_LABELS.landing).toBe("Landing Page");
    expect(CONTENT_LABELS.product).toBe("Product Description");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/writing.test.ts -t "content types"`
Expected: FAIL — `bandFor` / `CONTENT_TYPES` / `CONTENT_LABELS` not exported.

- [ ] **Step 3: Write minimal implementation**

In `writing.ts`, add after the imports / near `ArticleParams`:

```ts
export type ContentType = "blog" | "landing" | "product";
export const CONTENT_TYPES: readonly ContentType[] = ["blog", "landing", "product"];
export const CONTENT_LABELS: Record<ContentType, string> = {
  blog: "Blog",
  landing: "Landing Page",
  product: "Product Description",
};
const BANDS: Record<ContentType, [number, number]> = {
  blog: [1000, 2200],
  landing: [500, 1200],
  product: [120, 500],
};
export function bandFor(t: ContentType): [number, number] {
  return BANDS[t] ?? BANDS.blog;
}
```

And extend `ArticleParams`:

```ts
export type ArticleParams = {
  targetWords: number;
  tone: string;
  audience: string;
  brandFacts?: string;
  contentType?: ContentType; // default "blog" when absent
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kalamai/writing.test.ts -t "content types"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/writing.ts src/lib/kalamai/writing.test.ts
git commit -m "feat(kalamai): content-type constants + per-type word bands"
```

---

### Task 2: Branch `buildOutlinePrompt` by content type

**Files:**
- Modify: `src/lib/kalamai/writing.ts` (`buildOutlinePrompt`)
- Test: `src/lib/kalamai/writing.test.ts`

**Interfaces:**
- Consumes: `bandFor`, `ContentType` from Task 1; `params.contentType`.
- Produces: `buildOutlinePrompt` system text now depends on `params.contentType` (default blog). Blog branch text unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import { buildOutlinePrompt } from "./writing";
import { FAKE_BRIEF } from "./brief";

describe("buildOutlinePrompt per type", () => {
  const base = { targetWords: 1600, tone: "professional", audience: "marketers" };
  it("blog keeps the SEO/AEO strategist framing + 2200 ceiling", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, { ...base, contentType: "blog" });
    expect(system).toContain("1000 and 2200");
    expect(system).toContain("Conclusion");
  });
  it("landing targets a conversion structure + its band", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, { ...base, contentType: "landing" });
    expect(system).toContain("500 and 1200");
    expect(system.toLowerCase()).toContain("call to action");
    expect(system.toLowerCase()).toContain("benefit");
  });
  it("product targets a short product structure + its band", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, { ...base, contentType: "product" });
    expect(system).toContain("120 and 500");
    expect(system.toLowerCase()).toContain("features");
  });
  it("missing contentType behaves as blog", () => {
    const { system } = buildOutlinePrompt(FAKE_BRIEF, base);
    expect(system).toContain("1000 and 2200");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/writing.test.ts -t "buildOutlinePrompt per type"`
Expected: FAIL — landing/product produce blog text.

- [ ] **Step 3: Write minimal implementation**

Replace the body of `buildOutlinePrompt` so the system string branches. Keep the blog string exactly as it is today; add landing/product variants. Use `bandFor`.

```ts
export function buildOutlinePrompt(brief: Brief, params: ArticleParams): { system: string; user: string } {
  const ct: ContentType = params.contentType ?? "blog";
  const [lo, hi] = bandFor(ct);
  let system: string;
  if (ct === "landing") {
    system =
      "You are an expert conversion copywriter. Produce a section-by-section landing-page plan as JSON matching the schema. " +
      `Allocate 'words' across sections to total about ${params.targetWords} — the whole page must stay between ${lo} and ${hi} words, never over ${hi}. ` +
      "Structure the page for conversion: open with a hero value-proposition, then benefits, then features, then social proof, then objection handling, and END with a strong call to action. " +
      "Lead with benefits (what the reader gains), not neutral explanation. Ground claims in the brief's entities and recommended terms. " +
      "title must be <= 60 chars; description 120-160 chars. Also produce ogTitle (<= 70 chars) and ogDescription (110-160 chars) that are punchier and curiosity-driven. Do not invent facts.";
  } else if (ct === "product") {
    system =
      "You are an expert e-commerce product copywriter. Produce a section-by-section product-description plan as JSON matching the schema. " +
      `Allocate 'words' across sections to total about ${params.targetWords} — the whole description must stay between ${lo} and ${hi} words, never over ${hi}. ` +
      "Keep it short and scannable: open with a benefit hook, then key features, then specifications, then a use case, and END with a call to action. " +
      "Lead with concrete benefits and features, not filler. Ground claims in the brief's entities and recommended terms. " +
      "title must be <= 60 chars; description 120-160 chars. Also produce ogTitle (<= 70 chars) and ogDescription (110-160 chars). Do not invent facts.";
  } else {
    system =
      "You are an expert SEO/AEO content strategist. Produce a section-by-section writing plan as JSON matching the schema. " +
      `Allocate 'words' across sections to total ${params.targetWords} — the whole article must stay between 1000 and 2200 ` +
      "words, never over 2200. Ground every section in the brief's outline, entities, and recommended terms. " +
      "The FINAL section must be a Conclusion that takes a clear point of view (a recommendation the writer stands behind, " +
      "not a neutral summary) and calls out the low-hanging fruit — the highest-leverage actions the reader can act on " +
      "immediately. title must be <= 60 chars; description 120-160 chars. " +
      "Also produce ogTitle and ogDescription — social-share variants that are punchier and more curiosity-driven than the meta title/description (ogTitle <= 70 chars; ogDescription 110-160 chars). " +
      "Do not invent facts.";
  }
  const user = [
    `Tone: ${params.tone}. Audience: ${params.audience}.`,
    params.brandFacts ? `Brand facts: ${params.brandFacts}` : "",
    "Brief outline:",
    brief.outline.map((o) => `- ${o.h2}${o.h3.length ? ` (${o.h3.join(", ")})` : ""}`).join("\n"),
    "Recommended terms:",
    brief.termClusters.flatMap((c) => c.terms).slice(0, 30).join(", "),
    "Questions to answer:",
    brief.questions.map((q) => `- ${q}`).join("\n"),
  ].filter(Boolean).join("\n");
  return { system, user };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kalamai/writing.test.ts -t "buildOutlinePrompt"`
Expected: PASS. Also run the full file to confirm no regression: `npx vitest run src/lib/kalamai/writing.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/writing.ts src/lib/kalamai/writing.test.ts
git commit -m "feat(kalamai): branch outline prompt by content type"
```

---

### Task 3: Branch `buildSectionDraftPrompt` + `buildCritiquePrompt` by content type

**Files:**
- Modify: `src/lib/kalamai/writing.ts` (`buildSectionDraftPrompt`, `buildCritiquePrompt`)
- Test: `src/lib/kalamai/writing.test.ts`

**Interfaces:**
- Consumes: `bandFor`, `ContentType`, `params.contentType`.
- Produces: draft + critique prompts branch on content type. Blog text unchanged. Non-blog: draft drops the Blog-only "direct one-sentence answer" + FAQ-on-last rules and adds CTA guidance; critique swaps the article rubric for a conversion rubric and uses `bandFor` for the length line.

- [ ] **Step 1: Write the failing test**

```ts
describe("draft + critique per type", () => {
  const base = { targetWords: 800, tone: "professional", audience: "marketers" };
  const plan = { title: "t", description: "d", ogTitle: "og", ogDescription: "ogd", sections: [{ heading: "H", points: [], words: 300 }] };

  it("blog draft keeps the direct-answer rule", () => {
    const { system } = buildSectionDraftPrompt(FAKE_BRIEF, { ...base, contentType: "blog" }, plan, 0, [], []);
    expect(system).toContain("direct one-sentence answer");
  });
  it("landing draft drops direct-answer, asks for benefit-led + CTA", () => {
    const { system } = buildSectionDraftPrompt(FAKE_BRIEF, { ...base, contentType: "landing" }, plan, 0, [], []);
    expect(system).not.toContain("direct one-sentence answer");
    expect(system.toLowerCase()).toContain("benefit");
  });
  it("blog critique flags length against 1000-2200", () => {
    const { system } = buildCritiquePrompt(FAKE_BRIEF, { ...base, contentType: "blog" }, [{ type: "p", text: "hi" }], []);
    expect(system).toContain("1000-2200");
  });
  it("product critique flags length against its band + checks CTA", () => {
    const { system } = buildCritiquePrompt(FAKE_BRIEF, { ...base, contentType: "product" }, [{ type: "p", text: "hi" }], []);
    expect(system).toContain("120-500");
    expect(system.toLowerCase()).toContain("call to action");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/writing.test.ts -t "draft + critique per type"`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `buildSectionDraftPrompt`, compute `const ct = params.contentType ?? "blog"`. Keep the whole current blog `system` as-is when `ct === "blog"`. For non-blog, build a variant that:
- omits the "then a direct one-sentence answer" clause,
- keeps the h2/h3 + grounding/backlink + "return ONLY JSON array" + `sectionBlockSpec`,
- adds: `(ct==="landing" ? "Write benefit-led, persuasive copy. " : "Write concise, scannable product copy. ")`,
- keeps `isFirst` lead block; keeps `isLast` behavior BUT for landing/product replace "closing 'faq' block" with "closing 'callout' or short call-to-action paragraph" (FAQ optional). Simplest: only Blog emits the FAQ instruction on last; landing/product last section instead gets "AFTER the section content emit a closing call-to-action paragraph."

Concretely, restructure the system assembly:

```ts
const ct: ContentType = params.contentType ?? "blog";
const answerRule = ct === "blog" ? "then a direct one-sentence answer, then expand; " : "";
const voice =
  ct === "landing" ? "Write benefit-led, persuasive conversion copy. "
  : ct === "product" ? "Write concise, scannable product copy that leads with benefits and features. "
  : "";
const lastRule = !isLast ? "" :
  ct === "blog"
    ? "Because this is the FINAL section, AFTER the section content also emit a closing 'faq' block answering the brief's questions. "
    : "Because this is the FINAL section, AFTER the section content emit a closing call-to-action paragraph. ";
const system =
  `You are an expert ${params.tone} writer for an audience of ${params.audience}. ` +
  voice +
  "Write ONLY the ONE section described below, as a JSON array of ContentBlocks — not the whole article. " +
  `Aim for about ${section?.words ?? 400} words for this section. ` +
  `Open the section with its 'h2' heading, ${answerRule}use 'h3' for sub-points. ` +
  (isFirst ? "Because this is the FIRST section, emit an opening 'lead' block BEFORE the section's h2. " : "") +
  lastRule +
  "Do NOT repeat anything already covered by the earlier sections listed under 'Already written'. \n" +
  "GROUNDING: base any statistic, percentage, year, or factual claim on the Source facts below; never invent numbers " +
  "or cite unnamed 'studies'. When you state a statistic from a Source fact, BACKLINK it with an " +
  '{"t":"a","text":…,"href":…} span pointing to that fact\'s exact [source] URL. Only link to provided source URLs. ' +
  "Weave recommended terms in naturally; do not over-repeat any single term. Return ONLY the JSON array.\n" +
  sectionBlockSpec;
```

Note the FAQ-strip line (`sectionBlockSpec`) currently strips faq for non-last. For landing/product also strip faq on the last section (they use a CTA paragraph, not FAQ). Change:

```ts
const stripFaq = !isLast || ct !== "blog";
const sectionBlockSpec = stripFaq ? BLOCK_SPEC.replace(' {"type":"faq","items":[{"q":string,"a":string}]}', "") : BLOCK_SPEC;
```

In `buildCritiquePrompt`, compute `const ct = params.contentType ?? "blog"` and `const [lo, hi] = bandFor(ct)`. Keep the current strict article rubric for blog. For non-blog, use a conversion rubric:

```ts
const system = ct === "blog"
  ? /* existing blog critique string, but with the length line using lo/hi: */ (
      "You are a demanding SEO/AEO editor. Compare the draft against the brief and source facts, and return JSON per the " +
      "schema. In 'issues', flag every instance of:\n" +
      "1. A statistic or factual claim NOT supported by the source facts, or hedged with 'studies/surveys/experts suggest' " +
      "and similar with no concrete figure or named source — quote the offending phrase.\n" +
      "2. A statistic drawn from a source fact that is NOT backlinked to its source URL — those claims must cite their source.\n" +
      "3. Any single keyword or phrase repeated so often it reads as stuffing — name the term and roughly how many times.\n" +
      "4. Generic filler that could apply to any topic — demand a concrete specific, example, or figure instead.\n" +
      "5. Any section that does not open with a direct one-sentence answer.\n" +
      "6. A missing or weak Conclusion — it must state a genuine point of view and list low-hanging-fruit actions.\n" +
      `7. Length outside ${lo}-${hi} words (this draft is ${wordCount} words) — flag if over ${hi} or under ${lo}.\n` +
      "Also list recommended terms not used and brief outline sections not covered. Set ok=true ONLY if the draft is " +
      "specific, grounded, backlinked, free of stuffing, within the word band, ends with a POV conclusion, and every " +
      "section leads with a direct answer. A merely competent, generic draft is NOT ok — be strict."
    )
  : (
      "You are a demanding conversion-copy editor. Compare the draft against the brief and source facts, and return JSON per the " +
      "schema. In 'issues', flag every instance of:\n" +
      "1. A statistic or factual claim NOT supported by the source facts, or hedged with 'studies/surveys/experts suggest' — quote the offending phrase.\n" +
      "2. A statistic drawn from a source fact that is NOT backlinked to its source URL.\n" +
      "3. Any single keyword or phrase repeated so often it reads as stuffing — name the term.\n" +
      "4. Generic filler that could describe any product/offer — demand a concrete benefit, feature, or figure instead.\n" +
      "5. Copy that explains instead of persuading — it must lead with benefits to the reader.\n" +
      "6. A missing or weak call to action — the copy must end asking the reader to act.\n" +
      `7. Length outside ${lo}-${hi} words (this draft is ${wordCount} words) — flag if over ${hi} or under ${lo}.\n` +
      "Also list recommended terms not used. Set ok=true ONLY if the copy is specific, grounded, backlinked, benefit-led, " +
      "free of stuffing, within the word band, and ends with a clear call to action. A generic draft is NOT ok — be strict."
    );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kalamai/writing.test.ts`
Expected: PASS (new per-type tests + all existing writing tests — blog unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/writing.ts src/lib/kalamai/writing.test.ts
git commit -m "feat(kalamai): branch draft + critique prompts by content type"
```

---

### Task 4: Per-type word cap in the writing machine + articles route

**Files:**
- Modify: `src/lib/kalamai/writing-server.ts` (`stepScore`)
- Modify: `src/app/api/kalamai/articles/route.ts` (clamp + validate contentType)
- Modify: `src/lib/kalamai/writing.ts` (`buildArticleMeta` mirrors contentType into meta)
- Test: `src/lib/kalamai/writing.test.ts` (buildArticleMeta), `src/lib/kalamai/writing-server.test.ts`

**Interfaces:**
- Consumes: `bandFor`, `params.contentType`.
- Produces:
  - `stepScore` trims to `bandFor(contentType)[1]` not the hardcoded 2200.
  - `buildArticleMeta(brief, plan, contentType?)` — adds `contentType` to the returned `ArticleMeta`.
  - `ArticleMeta` type gains `contentType: ContentType`.
  - Articles route stores `contentType` in `params`, clamps `targetWords` to the type band.

- [ ] **Step 1: Write the failing test**

`buildArticleMeta` test in `writing.test.ts`:

```ts
import { buildArticleMeta } from "./writing";
it("buildArticleMeta records the content type (default blog)", () => {
  const meta = buildArticleMeta(FAKE_BRIEF, FAKE_OUTLINE, "landing");
  expect(meta.contentType).toBe("landing");
  expect(buildArticleMeta(FAKE_BRIEF, FAKE_OUTLINE).contentType).toBe("blog");
});
```

`writing-server.test.ts`: add a product-type end-to-end run asserting the finished blocks are within the product band. Follow the existing end-to-end test's harness (same in-memory Supabase mock + fake LLM). Assert `countWords(row.blocks) <= 500`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/writing.test.ts -t "buildArticleMeta records"`
Expected: FAIL — `contentType` missing on `ArticleMeta`.

- [ ] **Step 3: Write minimal implementation**

`writing.ts` — extend `ArticleMeta` and `buildArticleMeta`:

```ts
export type ArticleMeta = { title: string; description: string; ogTitle: string; ogDescription: string; jsonld: string; contentType: ContentType };

export function buildArticleMeta(brief: Brief, plan: SectionPlan, contentType: ContentType = "blog"): ArticleMeta {
  const title = plan.title || brief.metaTitles[0] || "";
  const description = plan.description || brief.metaDescriptions[0] || "";
  return { title, description, ogTitle: plan.ogTitle || title, ogDescription: plan.ogDescription || description, jsonld: brief.schemaJsonLd || "", contentType };
}
```

Fix the other `ArticleMeta` literal in `writing-server.ts stepScore` fallback (`{ title:"", ... }`) to include `contentType: a.params.contentType ?? "blog"`.

`writing-server.ts`:
- `stepOutline`: `const meta = buildArticleMeta(brief, plan, a.params.contentType ?? "blog");`
- `stepScore`: `const blocks = enforceWordCap(a.stage_state.blocks ?? [], bandFor(a.params.contentType ?? "blog")[1]);` (import `bandFor`).

`articles/route.ts`:
- Import `CONTENT_TYPES, bandFor` from `@/lib/kalamai/writing`.
- Parse: `const contentType = (CONTENT_TYPES as readonly string[]).includes(body.contentType) ? body.contentType : "blog";`
- Clamp uses the band: `const [lo, hi] = bandFor(contentType); targetWords: clamp(Math.round(Number(body.targetWords) || Math.round((lo+hi)/2)), lo, hi)`.
- Add `contentType` to the `params` object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kalamai/writing.test.ts src/lib/kalamai/writing-server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/writing.ts src/lib/kalamai/writing-server.ts src/app/api/kalamai/articles/route.ts src/lib/kalamai/writing.test.ts src/lib/kalamai/writing-server.test.ts
git commit -m "feat(kalamai): per-type word cap + store contentType in params/meta"
```

---

### Task 5: Content-type picker in the form + orchestrator param

**Files:**
- Modify: `src/components/kalamai/new-analysis-form.tsx`
- Modify: `src/components/kalamai/run-orchestrator.tsx`
- Modify: `src/components/kalamai/new-article-form.tsx` (if it also posts params — add the select there too for the report-page "write another" path)

**Interfaces:**
- Consumes: `CONTENT_LABELS`, `CONTENT_TYPES` from `writing.ts`.
- Produces: form stores `contentType` in `sessionStorage["kalamai-article-params:<id>"]`; `RunOrchestrator` `Params` + `DEFAULT_PARAMS` include `contentType: "blog"`; `new-article-form` posts `contentType`.

- [ ] **Step 1: Add the select to `new-analysis-form.tsx`**

Add `const [contentType, setContentType] = useState<"blog"|"landing"|"product">("blog");`. Render a select FIRST (above keyword), options from `CONTENT_TYPES`/`CONTENT_LABELS`. Add `contentType` to the `sessionStorage.setItem` payload. Button label stays "Generate article" for blog; optional: label by type (skip for now — YAGNI).

```tsx
<div className="space-y-1">
  <label htmlFor="ct" className="text-xs font-medium text-muted-foreground">Content type</label>
  <select id="ct" className={inputClass} value={contentType} onChange={(e) => setContentType(e.target.value as typeof contentType)}>
    {CONTENT_TYPES.map((t) => (<option key={t} value={t}>{CONTENT_LABELS[t]}</option>))}
  </select>
</div>
```

sessionStorage payload:
```ts
JSON.stringify({ targetWords, tone, audience: audience.trim(), brandFacts: brandFacts.trim(), contentType })
```

- [ ] **Step 2: Update `run-orchestrator.tsx`**

```ts
type Params = { targetWords: number; tone: string; audience: string; brandFacts: string; contentType: "blog"|"landing"|"product" };
const DEFAULT_PARAMS: Params = { targetWords: 1500, tone: "professional", audience: "", brandFacts: "", contentType: "blog" };
```
No other change — it already spreads `...params` into the `/api/kalamai/articles` POST body.

- [ ] **Step 3: Update `new-article-form.tsx`**

Read the file. If it POSTs to `/api/kalamai/articles`, add the same content-type select + include `contentType` in the body. If it only has fixed params, add the select and field.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit` (or `npm run build` if that's the project check).
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/kalamai/new-analysis-form.tsx src/components/kalamai/run-orchestrator.tsx src/components/kalamai/new-article-form.tsx
git commit -m "feat(kalamai): content-type picker in the article forms"
```

---

### Task 6: Redirect analysis report to the finished article

**Files:**
- Modify: `src/app/tools/kalamai/a/[id]/page.tsx`

**Interfaces:**
- Consumes: `listArticlesForAnalysis` (already imported).
- Produces: when a completed article exists for the analysis, the page issues `redirect("/tools/kalamai/w/<articleId>")` before rendering.

- [ ] **Step 1: Add the redirect**

Import `redirect` from `next/navigation`. After computing `articles` (line ~30), before the return:

```ts
const done = articles.find((art) => art.status === "complete");
if (done) redirect(`/tools/kalamai/w/${done.id}`);
```

`listArticlesForAnalysis` already returns newest-first, so `.find` picks the newest complete one. Keep the existing "Articles written from this brief" block for the (now rare) case where articles exist but none are complete yet.

- [ ] **Step 2: Verify build + manual check**

Run: `npx tsc --noEmit`
Expected: no type errors. (Manual: visit a completed analysis that has a finished article → lands on `/w/[id]`.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/tools/kalamai/a/[id]/page.tsx"
git commit -m "feat(kalamai): analysis report redirects to the finished article"
```

---

### Task 7: `listRecentArticles` query

**Files:**
- Modify: `src/lib/kalamai/queries-server.ts`
- Test: create `src/lib/kalamai/queries-server.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type RecentArticleItem = { articleId: string; title: string; keyword: string; contentType: ContentType; status: string; overall: number | null; createdAt: string };
  listRecentArticles(userId: string, limit?: number): Promise<RecentArticleItem[]>
  ```
- Consumes: `kalamai_articles` (user_id, meta, score, status, created_at, analysis_id) joined to `kalamai_analyses.keyword`.

- [ ] **Step 1: Write the failing test**

Follow the existing kalamai test mock pattern (grep `queries-server` usages / an existing `*-server.test.ts` for how `supabaseAdmin` is mocked in this repo). Test asserts:
- filters by `user_id`,
- maps `meta.title` → `title` (fallback "Untitled article"),
- `meta.contentType` → `contentType` (fallback "blog"),
- `score.overall` → `overall`,
- returns `articleId` for the `/w/` link,
- pulls `keyword` from the joined analysis.

```ts
import { describe, it, expect, vi } from "vitest";
// mock supabaseAdmin to return a fixed rows array with a nested analysis join, then:
// const rows = await listRecentArticles("u1", 10);
// expect(rows[0].articleId).toBe("art1");
// expect(rows[0].keyword).toBe("email marketing");
// expect(rows[0].contentType).toBe("landing");
// expect(rows[1].title).toBe("Untitled article");
// expect(rows[1].contentType).toBe("blog");
```

Use the same mocking approach the repo already uses for `supabaseAdmin()` chains (`.from().select().eq().order().limit()`); match it exactly so the chain resolves.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/queries-server.test.ts`
Expected: FAIL — `listRecentArticles` not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `queries-server.ts`:

```ts
import type { ContentType } from "./writing";

export type RecentArticleItem = {
  articleId: string;
  title: string;
  keyword: string;
  contentType: ContentType;
  status: string;
  overall: number | null;
  createdAt: string;
};

/** A user's finished + in-flight articles for the home + history lists, with the
 *  source keyword joined in. Ownership-scoped. Newest first. Links to /w/[id]. */
export async function listRecentArticles(userId: string, limit = 50): Promise<RecentArticleItem[]> {
  const { data } = await supabaseAdmin()
    .from("kalamai_articles")
    .select("id, status, meta, score, created_at, kalamai_analyses(keyword)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const meta = (r.meta ?? {}) as { title?: string; contentType?: ContentType };
    const score = (r.score ?? null) as { overall?: number } | null;
    const analysis = (r.kalamai_analyses ?? {}) as { keyword?: string } | { keyword?: string }[];
    const keyword = Array.isArray(analysis) ? analysis[0]?.keyword ?? "" : analysis.keyword ?? "";
    return {
      articleId: r.id as string,
      title: meta.title || "Untitled article",
      keyword,
      contentType: meta.contentType ?? "blog",
      status: r.status as string,
      overall: score?.overall ?? null,
      createdAt: r.created_at as string,
    };
  });
}
```

Note: the embedded-resource shape (`kalamai_analyses(keyword)`) depends on the FK from `kalamai_articles.analysis_id`. If PostgREST returns it as an array vs object, the `Array.isArray` guard handles both. Verify the FK relationship name during implementation (`list_tables` or check the migration); if the relationship isn't auto-detectable, fall back to a second query keyed on the collected `analysis_id`s.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kalamai/queries-server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/queries-server.ts src/lib/kalamai/queries-server.test.ts
git commit -m "feat(kalamai): listRecentArticles query joining keyword"
```

---

### Task 8: Content-type badge component

**Files:**
- Create: `src/components/kalamai/content-type-badge.tsx`

**Interfaces:**
- Produces: `<ContentTypeBadge type={contentType} />` — a small pill rendering `CONTENT_LABELS[type]`.

- [ ] **Step 1: Write the component**

```tsx
import { CONTENT_LABELS, type ContentType } from "@/lib/kalamai/writing";

export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="shrink-0 rounded-btn border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {CONTENT_LABELS[type] ?? "Blog"}
    </span>
  );
}
```

Note: `writing.ts` imports `server-only`? Check — `writing.ts` is pure string assembly (no `server-only` import per the file header), so importing `CONTENT_LABELS` into a client/shared component is safe. Confirm no `import "server-only"` at the top of `writing.ts` before this task (there isn't as of the spec read). If it were added, move the constants to a tiny `content-types.ts` with no server-only import.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/kalamai/content-type-badge.tsx
git commit -m "feat(kalamai): content-type badge"
```

---

### Task 9: Home "Recent" + History list articles → /w/[id]

**Files:**
- Modify: `src/app/tools/kalamai/page.tsx`
- Modify: `src/app/tools/kalamai/history/page.tsx`

**Interfaces:**
- Consumes: `listRecentArticles` (Task 7), `ContentTypeBadge` (Task 8).

- [ ] **Step 1: Update `page.tsx` Recent section**

Swap `listRecentAnalyses(ctx.user.id, 8)` → `listRecentArticles(ctx.user.id, 8)`. Rename heading "Recent analyses" → "Your content". Rows link to `/tools/kalamai/w/${r.articleId}`, show title (or keyword fallback), `<ContentTypeBadge type={r.contentType} />`, and the status/score pill:

```tsx
{recent.map((r) => (
  <li key={r.articleId}>
    <Link href={`/tools/kalamai/w/${r.articleId}`} className="flex items-center justify-between gap-3 p-4 transition-ui hover:bg-muted">
      <span className="min-w-0">
        <span className="block truncate text-sm">{r.title !== "Untitled article" ? r.title : r.keyword}</span>
        <span className="text-xs text-muted-foreground">{r.keyword}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <ContentTypeBadge type={r.contentType} />
        <span className="rounded-btn bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
          {r.overall != null ? `${r.status} · ${r.overall}/100` : r.status}
        </span>
      </span>
    </Link>
  </li>
))}
```

Empty state: "You haven't created any content yet." "All history" link unchanged. Remove the now-unused `listRecentAnalyses` import if nothing else on the page uses it.

- [ ] **Step 2: Update `history/page.tsx`**

Same swap: `listRecentAnalyses(ctx.user!.id, 50)` → `listRecentArticles(ctx.user!.id, 50)`; rows link to `/w/[articleId]` with title + badge + status/score; header "History" stays; empty state "No content yet."

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/kalamai/page.tsx src/app/tools/kalamai/history/page.tsx
git commit -m "feat(kalamai): Recent + History list finished articles"
```

---

### Task 10: Full suite + build gate

**Files:** none (verification only).

- [ ] **Step 1: Run the kalamai test suite**

Run: `npx vitest run src/lib/kalamai`
Expected: all green (blog regression intact, landing/product covered).

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: exit 0 (per [[verify-next-build-exit-and-server-only]] — trust the exit code; a client importing a `server-only` module passes tsc but fails the build).

- [ ] **Step 3: Offline smoke (optional, if a dev server is used)**

`KALAMAI_FAKE_SERP=1 KALAMAI_FAKE_LLM=1` — create a landing + product article via the form, confirm each completes and renders within band, and that Recent/History link straight to `/w/[id]`.

- [ ] **Step 4: Commit any fixes, then open PR**

Per AGENTS.md: write a `Tweet:` line in the PR body (read `docs/PR-TWEET.md` first — five drafts, ship one). Do not merge until the owner OKs (per deploy-wait-for-instruction).

---

## Self-Review

**Spec coverage:**
- Data seam (contentType on params, mirror to meta) → Tasks 1, 4. ✓
- Section 1 content type (form, params flow, 3 prompt builders, bands, enforceWordCap, fakes) → Tasks 2, 3, 4, 5. ✓
- Section 2 redirect → Task 6. ✓
- Section 3 find articles (query + UI + badge) → Tasks 7, 8, 9. ✓
- Section 4 testing → embedded per task + Task 10. ✓

**Placeholder scan:** No TBD/TODO; every code step has real code. The one soft spot (Task 7 mock shape, Task 3 `new-article-form` exact edits) instructs "match the existing repo pattern / read the file" because those patterns must be copied from live code — flagged explicitly, not hand-waved.

**Type consistency:** `ContentType`, `bandFor`, `CONTENT_TYPES`, `CONTENT_LABELS`, `buildArticleMeta(brief, plan, contentType)`, `ArticleMeta.contentType`, `RecentArticleItem.articleId` used consistently across tasks. `listRecentArticles` returns `articleId` (not `id`) everywhere it's consumed (Task 9 uses `r.articleId`). ✓

**Fake-mode note:** `FAKE_OUTLINE` has 3 sections summing 1200 words — over the product band [120,500]. In fake mode `enforceWordCap` (Task 4) trims to band, so the product end-to-end test asserts the *post-cap* word count ≤ 500, which holds regardless of the fake outline. No fake change required.
