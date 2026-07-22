# KalamAI section-by-section drafting — design

**Date:** 2026-07-22
**Status:** approved (design), pending implementation plan

## Problem

The article writer's **W2 draft** (`stepDraft`) generates the whole article in ONE
`runText` call with `maxTokens: 32000`. For longer articles this single LLM
generation exceeds the step route's **60s** Vercel Hobby `maxDuration` → the lambda
is killed (504) → status stays `outlining`, the single-flight lock churns, W2
re-runs → killed again = the article wedges at `outlining` **and re-bills partial
tokens each cycle**. Confirmed live 2026-07-22 (article `5f2575f6` for "how to choose
a project management tool" stuck at `outlining`/15, one 504 in the request log).

**W4 rewrite** (`stepRewrite`) has the identical shape — a single 32k `runText` call —
so it wedges the same way whenever `critique.ok === false`. Both must be fixed.

This is a pre-existing writer bug (not introduced by the one-hit flow); the one-hit
flow surfaced it by generating an article on every run.

## Root cause

A single unbounded LLM generation cannot be guaranteed to finish inside a 60s
serverless invocation. The fix is to split the generation into per-section calls, each
comfortably under 60s, driven across multiple `/api/kalamai/article-step` pokes — the
same batching pattern the analysis crawler (`crawl_cursor`) already uses.

## Decisions (locked)

- **Scope:** batch BOTH W2 (draft) and W4 (rewrite) section-by-section.
- **Granularity:** ONE section per `/step` call (each section ~300–500 words → each
  generation well under 60s; simplest cursor logic).
- **State:** cursors + accumulated per-section blocks live in the existing
  `kalamai_articles.stage_state` jsonb — **no migration**.
- **Status values unchanged** (`queued→outlining→drafting→reviewing→scoring→complete`);
  the multi-call drafting happens *within* the `outlining→drafting` and
  `reviewing→scoring` transitions via cursors.
- **Coherence:** each section call receives the headings of already-drafted sections
  (`priorHeadings`) so it doesn't repeat earlier content.
- No new deps, no migration, `enforceWordCap` backstop unchanged.
- Out of scope: deeper prose-quality tuning (stays in the KalamAI quality backlog),
  raising the 2200-word cap, Vercel Pro.

## Design

### Stage state additions (`StageState` in `writing-server.ts`)
```ts
type StageState = {
  plan?: SectionPlan;
  meta?: ArticleMeta;
  blocks?: ContentBlock[];           // final assembled article (as today)
  critique?: Critique;
  sectionBlocks?: ContentBlock[][];  // NEW: blocks per section, index-aligned to plan.sections
  draftCursor?: number;              // NEW: next section index to draft
  rewriteCursor?: number;            // NEW: next section index to rewrite
};
```

### W2 — `stepDraft` (runs while status `outlining`)
One section per call:
1. `const plan = stage_state.plan!`, `const sections = plan.sections`.
2. `const cursor = stage_state.draftCursor ?? 0`.
3. `const priorHeadings = sections.slice(0, cursor).map(s => s.heading)`.
4. Draft section `cursor` via `buildSectionDraftPrompt(brief, params, plan, cursor, priorHeadings, sourceFacts)`
   → `runText` (fake `FAKE_SECTION_DRAFT`) → `parseWithRepair` → `ContentBlock[]`.
   - Section 0's prompt also asks for an opening `lead` block first.
   - The LAST section's prompt (`cursor === sections.length - 1`) also asks for a
     closing `faq` block answering the brief's questions (the Conclusion is already
     the final planned section).
5. `sectionBlocks[cursor] = blocks`, `draftCursor = cursor + 1`.
6. Progress = `15 + Math.round(25 * (cursor + 1) / sections.length)` (climbs 15→40).
7. If `draftCursor < sections.length`: persist `{sectionBlocks, draftCursor, progress}`,
   **stay status `outlining`**, return.
8. Else assemble `blocks = sectionBlocks.flat()`, persist `{sectionBlocks, blocks}`,
   set status `drafting`, progress 40.

Edge: `sections.length === 0` (shouldn't happen — outline guarantees sections) →
treat as done: `blocks = []`, set `drafting`. `enforceWordCap`/critique handle empties.

### W3 — `stepCritique` (unchanged)
Critiques the assembled `blocks` exactly as today.

### W4 — `stepRewrite` (runs while status `reviewing`)
- If `critique.ok`: skip (no spend) — assemble nothing new, set status `scoring`,
  progress 85 (unchanged behavior).
- Else, one section per call:
  1. `const cursor = stage_state.rewriteCursor ?? 0`.
  2. `priorHeadings = sections.slice(0, cursor).map(s => s.heading)`.
  3. Rewrite `sectionBlocks[cursor]` via
     `buildSectionRewritePrompt(brief, params, sectionBlocks[cursor], critique, sections[cursor].heading, priorHeadings)`
     → `runText` (fake `FAKE_SECTION_DRAFT`) → `parseWithRepair` → replace
     `sectionBlocks[cursor]`.
  4. `rewriteCursor = cursor + 1`, progress = `60 + Math.round(25 * (cursor + 1) / sections.length)` (60→85).
  5. If `rewriteCursor < sections.length`: persist, **stay `reviewing`**, return.
  6. Else `blocks = sectionBlocks.flat()`, persist, set status `scoring`, progress 85.

### W5 — `stepScore` (unchanged)
`enforceWordCap(stage_state.blocks)` remains the hard-cap backstop; meta unchanged.

## New / changed prompt builders (`writing.ts`)

- **`buildSectionDraftPrompt(brief, params, plan, sectionIndex, priorHeadings, sourceFacts)`
  → `{ system, user, cachePrefix }`** — drafts ONE section's ContentBlocks. Reuses
  `BLOCK_SPEC`, the grounding/backlink rules, and `buildCachePrefix(brief, params)` as
  the cache prefix (invariant across calls → cache hits). The per-section content goes
  in `user`. Instructs: emit ONLY this section's blocks (its `h2`, optional `h3`s,
  paragraphs); open with a direct one-sentence answer; do not repeat the prior sections
  (`priorHeadings`). If `sectionIndex === 0`, also emit an opening `lead` first. If it's
  the final section, also emit a closing `faq`.
- **`buildSectionRewritePrompt(brief, params, sectionBlocks, critique, sectionHeading, priorHeadings)`
  → `{ system, user, cachePrefix }`** — rewrites ONE section's blocks applying the
  critique, returning ONLY that section's revised ContentBlocks.
- **`FAKE_SECTION_DRAFT: string`** — a small fixed `JSON.stringify([...])` (e.g. one
  `h2` + one `p`) so fake-LLM mode returns a per-section chunk, not the whole article.
  Used as the `fake` for both section draft and section rewrite calls.

The existing `buildDraftPrompt` / `buildRewritePrompt` / `FAKE_DRAFT` / `FAKE_REWRITE`
may be removed if nothing else references them after the server switch, or left in place
(dead) — the plan decides based on references; prefer removing to avoid confusion.

## Testing

- **`writing.test.ts`** (pure): `buildSectionDraftPrompt` — section 0 asks for a `lead`,
  the last section asks for a `faq`, a middle section asks for neither and includes
  `priorHeadings`; the cache prefix equals `buildCachePrefix(brief, params)` for every
  index (cache-stable). `buildSectionRewritePrompt` — includes the critique points and
  the target section heading. `FAKE_SECTION_DRAFT` parses to a small valid ContentBlock[].
- **`writing-server.test.ts`** (machine, fake LLM): drive `runArticleStep` in a loop
  until terminal; assert (1) it reaches `complete` with a non-empty assembled `blocks`;
  (2) drafting took `sections.length` draft calls (status stayed `outlining` across them
  — e.g. assert an intermediate poke returns `outlining` with `draftCursor` advancing);
  (3) with a forced `critique.ok = false`, rewrite also runs section-by-section and still
  reaches `complete`. Keep using the existing in-memory Supabase mock.

## Non-goals

- Prose-quality/flow tuning across section seams (quality backlog).
- Changing status enums, the 2200 cap, or infra (Hobby → Pro).
