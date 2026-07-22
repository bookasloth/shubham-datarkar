# KalamAI one-hit flow — design

**Date:** 2026-07-22
**Status:** approved (design), pending implementation plan

## Goal

Collapse the current two-hit KalamAI flow (keyword → *hit* → analysis → *hit* → article)
into a **single hit** on **one page**: the user enters all inputs once, hits Generate,
and watches keyword become a finished, SEO-complete blog — analysis and article run
back-to-back with no review beat and no navigation.

## Current state (reuse, do not rebuild)

- **Two DB rows, two step-machines, client-driven pollers:**
  - `kalamai_analyses` — `/api/kalamai/step` (`runStep`), `AnalysisPoller` on `/a/[id]`.
  - `kalamai_articles` — `/api/kalamai/article-step`, `ArticlePoller` on `/w/[id]`.
- **Article backend already accepts** `targetWords` (clamped 1000–2200), `audience`,
  `tone`, `brandFacts` (`src/app/api/kalamai/articles/route.ts`).
- **Article writer already emits** full `ContentBlock[]` (h2, h3, p, table, steps,
  takeaways, faq …) rendered by `ArticleBody`, plus `ArticleMeta { title, description, jsonld }`
  (meta title + meta description) via `buildArticleMeta` (`src/lib/kalamai/writing.ts`).
- **Brief** (`brief.ts`) already generates `metaTitles[]` / `metaDescriptions[]` candidates.

## Decisions (locked)

- **Flow shape:** fully automatic, one hit, one page.
- **Build approach:** **A — client orchestrator.** No backend state-machine merge.
- **Step-0 inputs:** keyword, location, word count, audience, tone, brand facts
  (all already backend-supported; only UI fields are missing).
- **Word-count ceiling:** keep **1000–2200** (`enforceWordCap` unchanged).
- **OG title/description:** **social-optimized variant** — LLM writes them distinctly
  from meta (new schema field-pair).
- Out of scope: CTA input, internal-link input, output-language/Hinglish toggle,
  raising the word cap, server-side pipeline chaining, streaming (SSE/WebSocket).

## Target flow

### 1. Step-0 form (`/tools/kalamai`)
One card, six fields:
- Keyword (text, required)
- Location (country select — existing)
- Word count (number/select, 1000–2200, default 1600)
- Audience (text, e.g. "small business owners in Nagpur")
- Tone (select: professional / casual / … default professional)
- Brand facts (textarea, optional, ≤1000 chars)

Submit posts to the existing analyses route with keyword/country/locale, and **stashes
the article params** (targetWords/audience/tone/brandFacts) for the orchestrator to use
when it auto-creates the article. **Stash = `sessionStorage` keyed by analysis id**
(reload-safe within the tab, no migration). Upgrade path if cross-device/tab resume ever
matters: add an `article_params jsonb` column to `kalamai_analyses` and persist there.

### 2. Run page — one orchestrator component
Replaces the bare `AnalysisPoller` on the analysis run page with a `RunOrchestrator`
that drives the whole journey:

1. Poll `/api/kalamai/step` until analysis `status = complete` (existing machine).
2. Auto-`POST /api/kalamai/articles` with the stashed params → get `articleId`.
3. Poll `/api/kalamai/article-step` until article `status = complete` (existing machine).
4. Reveal the finished article **inline** on the same page.

On `failed` at either stage: show the existing failure card (quota refunded, as today).

### 3. Perceived-progress layer (while ~2–3 min elapses)
- **Two-phase timeline:** *Researching* (crawling → extracting terms) and *Writing*
  (outline → draft → polish), derived from the two machines' statuses.
- **SEO tips carousel:** a static array of **100 one-line SEO tips** (new file, e.g.
  `src/lib/kalamai/seo-tips.ts`), rotating every few seconds client-side. No LLM, no cost.
- **Live artifacts** as they land (data already in DB per step): crawled competitor
  URLs, then extracted terms, then article sections as the draft fills in.

### 4. Output (inline at completion)
- Full blog via `ArticleBody`: H1 (title) + paragraphs + H2s + tables + H3s + conclusion.
- **Meta/social panel:**
  - Meta title + meta description (exist).
  - **OG title + OG description** (new).
- Permalink to `/w/[id]` (canonical article page, unchanged).

## Backend change (only new server work)

**OG title/description generation + storage.**
- Extend the writer's outline/meta output schema (`OUTLINE_SCHEMA` / `SectionPlan`
  in `writing.ts`) with `ogTitle` and `ogDescription`, prompted as social-optimized
  (punchier than meta; OG title ≤ ~70 chars, OG description ~110–160 chars).
- Extend `ArticleMeta` type → `{ title, description, ogTitle, ogDescription, jsonld }`
  and `buildArticleMeta` to fill them (fall back to meta title/description if the model
  omits them).
- Persist into `kalamai_articles.meta` (existing JSON column — no migration).
- Surface in the inline meta/social panel and on `/w/[id]`.

Everything else (inputs, blocks, meta title/desc, pollers, quota) is reuse.

## Components / files (anticipated)

- `src/components/kalamai/new-analysis-form.tsx` — add the five extra fields.
- `src/components/kalamai/run-orchestrator.tsx` — **new**, replaces `AnalysisPoller`
  on the run page; owns the two-machine journey + progress layer.
- `src/lib/kalamai/seo-tips.ts` — **new**, 100 tips.
- `src/lib/kalamai/writing.ts` — OG fields in schema/prompt/`buildArticleMeta`/`ArticleMeta`.
- Meta/social panel — inline on run page + on `/w/[id]`.

## Error handling

- Either machine flipping to `failed` → existing failure card; quota already refunds
  (a failed row drops out of the quota count).
- Article auto-create failing (e.g. quota exhausted mid-flow) → surface a clear message
  on the run page; the completed analysis is still viewable/persisted.
- Tips carousel and live-artifact fetches are best-effort; their failure never blocks
  the pipeline.

## Testing

- `writing.ts` OG generation: unit test that `buildArticleMeta` populates ogTitle/
  ogDescription and falls back to meta when the model omits them.
- `seo-tips.ts`: assert exactly 100 non-empty unique one-liners.
- Orchestrator: the two-machine handoff is integration-ish; cover the create-article
  transition with a focused test where feasible, otherwise verify live on prod (fake
  SERP/LLM offline mode exists).

## Non-goals / deferred

- Raising the 2200-word cap.
- Paid-member cost gating for the auto-article spend (flag for later).
- Wiring semantic clusters/rescore (still shadow; fake embeds in prod).
