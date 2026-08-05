# KalamAI — content types + discoverability

**Date:** 2026-08-05
**Branch:** `feat/kalamai-content-types`

Three changes to KalamAI, all sharing one data seam:

1. **Content type** — user picks Blog / Landing Page / Product Description; writing engine branches structure + word band per type. Blog = current behavior.
2. **Always land on written content** — visiting an analysis that already has a finished article redirects to that article.
3. **Find my articles** — Recent/History lists finished articles (linking to `/w/[id]`), not analyses.

Research pipeline (SERP → crawl → brief) runs unchanged for all three types. Only the writing engine differs.

---

## Data seam (shared)

Add `contentType: "blog" | "landing" | "product"` to `ArticleParams` in `src/lib/kalamai/writing.ts`. Default `"blog"`.

- `params` is already a jsonb column on `kalamai_articles`, written by the articles route and passed to every prompt builder via `a.params`. **No migration.**
- Mirror `contentType` into the `meta` jsonb (via `buildArticleMeta`) so the articles-list query can render a type badge from `meta` without selecting `params`.

Content-type constants (new, in `writing.ts`):

```
CONTENT_TYPES = ["blog", "landing", "product"] as const
BANDS = { blog: [1000, 2200], landing: [500, 1200], product: [120, 500] }
LABELS = { blog: "Blog", landing: "Landing Page", product: "Product Description" }
```

`bandFor(contentType) => [min, max]` helper. Replaces every hardcoded 1000/2200.

---

## Section 1 — Content type (writing engine)

### Form
`new-analysis-form.tsx`: add a **Content type** select as the first field (Blog / Landing Page / Product Description, default Blog). Store `contentType` alongside the other article params in `sessionStorage["kalamai-article-params:<id>"]`.

### Params flow
- `run-orchestrator.tsx`: include `contentType` in `Params` type + `DEFAULT_PARAMS` (`"blog"`).
- `/api/kalamai/articles` route: read `body.contentType`, validate against `CONTENT_TYPES` (fallback `"blog"`), add to the stored `params`. Word clamp uses `bandFor(contentType)` instead of hardcoded `[1000, 2200]`.

### Prompt branching
Branch three builders in `writing.ts` on `params.contentType`. Blog path = current text verbatim (no regression). Each type gets a structure block + its band.

**Structure targets** (drive the outline prompt; draft/critique reference them):

- **Blog** (unchanged): direct-answer H2 sections, FAQ, POV conclusion, low-hanging-fruit list.
- **Landing Page** (500–1200w): hero value-prop `lead` → benefits (`ul`/`steps`) → features → social proof (`callout`/`quote`) → objection handling → strong closing CTA. Persuasive, benefit-led. No "direct answer per section" rule; no research-y FAQ unless it serves objections.
- **Product Description** (120–500w): benefit-hook `lead` → key features (`ul`) → specs (`table`) → use case → CTA. Short. No FAQ, no POV-conclusion requirement, no 1000-word floor.

Builders to change:
- `buildOutlinePrompt` — system prompt: swap the "expert SEO/AEO content strategist … 1000–2200 … final Conclusion with POV" text for a per-type variant. Band from `bandFor`.
- `buildSectionDraftPrompt` — per-type writing guidance; the "open each section with a direct one-sentence answer" instruction is Blog-only. `isLast` FAQ emission: Blog only.
- `buildCritiquePrompt` — Blog keeps the strict article rubric. Landing/Product critique checks: benefit-led (not generic), has a clear CTA, grounded/backlinked stats, no stuffing, within band. Length check uses `bandFor`.

`enforceWordCap` (W5 backstop) takes the per-type max: `enforceWordCap(blocks, bandFor(contentType)[1])`. For product/landing the preserved tail (`faq`/`takeaways`) may be empty — fine, it already handles that.

### Fakes
Add `FAKE_OUTLINE` variants or make the existing fake generic enough that a landing/product run parses. Keep offline mode (`KALAMAI_FAKE_LLM=1`) green.

---

## Section 2 — Always land on written content

`src/app/tools/kalamai/a/[id]/page.tsx` (analysis report): after loading the analysis, call `listArticlesForAnalysis(id)`; if any article has `status === "complete"`, `redirect("/tools/kalamai/w/" + newestComplete.id)` (server component redirect). Newest-first is already the query's order.

Effect: once content exists, the brief page auto-forwards to the finished article. Live runs already end at `/w/[id]` via `RunOrchestrator`; this covers revisits and shared links. The article page has its own back-link to the analysis for the advanced view.

Edge: analysis complete but no article yet (or article failed) → stay on the report page as today.

---

## Section 3 — Find my articles

New query in `queries-server.ts`:

```
listRecentArticles(userId, limit=50): {
  articleId, title, keyword, contentType, status, overall, createdAt
}[]
```

Joins `kalamai_articles` → `kalamai_analyses` (for `keyword`), filters `kalamai_articles.user_id = userId` (articles carry `user_id`), newest first. `title` from `meta.title` (fallback "Untitled"), `contentType` from `meta.contentType` (fallback "blog"), `overall` from `score.overall`.

UI:
- `page.tsx` "Recent" section → `listRecentArticles(userId, 8)`, rows link to `/tools/kalamai/w/[articleId]`, show title, content-type badge, score, status. Heading → "Your content". Empty state: "You haven't created any content yet."
- `history/page.tsx` → `listRecentArticles(userId, 50)`, same row shape.

Analyses list is no longer surfaced as a top-level list; reachable per-article. `listRecentAnalyses` stays (still used by the report/other callers if any — verify before deleting; likely keep).

Content-type badge: small pill using `LABELS[contentType]`.

---

## Section 4 — Testing

- `writing.test.ts` (or new `content-types.test.ts`): for each content type, `buildOutlinePrompt`/`buildSectionDraftPrompt`/`buildCritiquePrompt` produce the right band in the prompt and the type-appropriate structure keywords; Blog output byte-identical to pre-change (regression guard).
- `writing-server.test.ts`: drive a `landing` and a `product` article end-to-end on fakes → completes, blocks parse, word count within band.
- `bandFor` unit test.
- `queries-server` test: `listRecentArticles` ownership scoping + returns article id for the `/w/` link + contentType fallback.

---

## Out of scope (skipped)

- No new tables / migration (params + meta are jsonb).
- No block editor, no export changes.
- No per-type SERP/crawl tuning — research identical across types.
- No dedup of analyses by keyword (Feature 2 is redirect-on-existing-article, not skip-generation).
