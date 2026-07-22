# KalamAI Section-by-Section Drafting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the article writer's draft (W2) and rewrite (W4) into one-section-per-`/step`-call loops so neither single LLM generation can exceed Vercel Hobby's 60s route limit and wedge the article.

**Architecture:** Add per-section cursors + accumulated `sectionBlocks` to the existing `kalamai_articles.stage_state` jsonb (no migration). `stepDraft` drafts section `draftCursor` and stays at status `outlining` until all sections are drafted, then assembles and moves on; `stepRewrite` does the same with `rewriteCursor` while status `reviewing`. New per-section prompt builders replace the single-call ones.

**Tech Stack:** TypeScript, Supabase (jsonb `stage_state`), Vitest with `KALAMAI_FAKE_LLM=1` in-memory mock, existing `runText`/`parseWithRepair`/`runJson` helpers.

## Global Constraints

- No new dependencies. No DB migration (cursors/blocks live in `stage_state` jsonb).
- Status enum unchanged: `queued→outlining→drafting→reviewing→scoring→complete`.
- `enforceWordCap` (2200) unchanged — it stays the hard backstop in `stepScore`.
- Cache prefix for every section call must equal `buildCachePrefix(brief, params)` (byte-identical) so prompt caching keeps hitting.
- One section per `/step` call.
- Windows Git Bash; tests via `npx vitest run <path>`, typecheck via `npx tsc --noEmit -p tsconfig.json`.
- PR flow with a `Tweet:` line per `docs/PR-TWEET.md`.

---

### Task 1: Per-section prompt builders + fake fixture (writing.ts)

**Files:**
- Modify: `src/lib/kalamai/writing.ts` (add `buildSectionDraftPrompt`, `buildSectionRewritePrompt`, `FAKE_SECTION_DRAFT`)
- Test: `src/lib/kalamai/writing.test.ts`

**Interfaces produced:**
- `buildSectionDraftPrompt(brief: Brief, params: ArticleParams, plan: SectionPlan, sectionIndex: number, priorHeadings: string[], sourceFacts?: SourceFact[]): { system: string; user: string; cachePrefix: string }`
- `buildSectionRewritePrompt(brief: Brief, params: ArticleParams, sectionBlocks: ContentBlock[], critique: Critique, sectionHeading: string, priorHeadings: string[]): { system: string; user: string; cachePrefix: string }`
- `FAKE_SECTION_DRAFT: string` (JSON array of a small ContentBlock[])

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/kalamai/writing.test.ts` (ensure the import from `./writing` includes `buildSectionDraftPrompt`, `buildSectionRewritePrompt`, `FAKE_SECTION_DRAFT`, `FAKE_OUTLINE`; the file already imports several writing exports and `type Brief`):

```ts
import {
  buildSectionDraftPrompt, buildSectionRewritePrompt, buildCachePrefix,
  FAKE_SECTION_DRAFT, FAKE_OUTLINE,
} from "./writing";

const briefStub = {
  metaTitles: ["T"], metaDescriptions: ["D"], schemaJsonLd: "{}",
  outline: [{ h2: "H", h3: [] }],
  termClusters: [{ label: "c", terms: ["seo", "ppc"] }],
  questions: ["What is X?"],
} as unknown as import("./brief").Brief;
const paramsStub = { targetWords: 1500, tone: "professional", audience: "smb owners" };

describe("buildSectionDraftPrompt", () => {
  it("section 0 asks for an opening lead", () => {
    const { system } = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 0, []);
    expect(system.toLowerCase()).toContain("lead");
  });
  it("the final section asks for a closing faq", () => {
    const last = FAKE_OUTLINE.sections.length - 1;
    const { system } = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, last, ["a", "b"]);
    expect(system.toLowerCase()).toContain("faq");
  });
  it("a middle section asks for neither lead nor faq and lists prior headings", () => {
    const { system, user } = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 1, ["Prior One"]);
    expect(system.toLowerCase()).not.toContain("lead block");
    expect(system.toLowerCase()).not.toContain("faq");
    expect(user).toContain("Prior One");
    expect(user).toContain(FAKE_OUTLINE.sections[1].heading);
  });
  it("cache prefix is stable across section indexes", () => {
    const p0 = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 0, []).cachePrefix;
    const p2 = buildSectionDraftPrompt(briefStub, paramsStub, FAKE_OUTLINE, 2, ["a", "b"]).cachePrefix;
    expect(p0).toBe(buildCachePrefix(briefStub, paramsStub));
    expect(p2).toBe(p0);
  });
});

describe("buildSectionRewritePrompt", () => {
  it("includes the critique points and the target section heading", () => {
    const critique = { missingTerms: ["schema"], missingSections: [], issues: ["too generic"], ok: false };
    const { user } = buildSectionRewritePrompt(briefStub, paramsStub, [{ type: "p", text: "x" }], critique, "My Section", []);
    expect(user).toContain("schema");
    expect(user).toContain("too generic");
    expect(user).toContain("My Section");
  });
});

describe("FAKE_SECTION_DRAFT", () => {
  it("parses to a small non-empty ContentBlock array", () => {
    const arr = JSON.parse(FAKE_SECTION_DRAFT);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBeGreaterThan(0);
    expect(arr.length).toBeLessThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/kalamai/writing.test.ts`
Expected: FAIL — `buildSectionDraftPrompt`/`buildSectionRewritePrompt`/`FAKE_SECTION_DRAFT` are not exported.

- [ ] **Step 3: Implement in `src/lib/kalamai/writing.ts`**

Add these exports (place them after the existing `buildDraftPrompt` / near the W2/W4 section). They reuse the existing module-level `BLOCK_SPEC`, `factsBlock`, `buildCachePrefix`, and `blocksToMarkdown`:

```ts
/* — W2 (section-by-section): draft ONE section — */

export function buildSectionDraftPrompt(
  brief: Brief,
  params: ArticleParams,
  plan: SectionPlan,
  sectionIndex: number,
  priorHeadings: string[],
  sourceFacts: SourceFact[] = [],
): { system: string; user: string; cachePrefix: string } {
  const section = plan.sections[sectionIndex];
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === plan.sections.length - 1;
  const system =
    `You are an expert ${params.tone} SEO writer for an audience of ${params.audience}. ` +
    "Write ONLY the ONE section described below, as a JSON array of ContentBlocks — not the whole article. " +
    `Aim for about ${section?.words ?? 400} words for this section. ` +
    "Open the section with its 'h2' heading, then a direct one-sentence answer, then expand; use 'h3' for sub-points. " +
    (isFirst ? "Because this is the FIRST section, emit an opening 'lead' block BEFORE the section's h2. " : "") +
    (isLast ? "Because this is the FINAL section, AFTER the section content also emit a closing 'faq' block answering the brief's questions. " : "") +
    "Do NOT repeat anything already covered by the earlier sections listed under 'Already written'. \n" +
    "GROUNDING: base any statistic, percentage, year, or factual claim on the Source facts below; never invent numbers " +
    "or cite unnamed 'studies'. When you state a statistic from a Source fact, BACKLINK it with an " +
    '{"t":"a","text":…,"href":…} span pointing to that fact\'s exact [source] URL. Only link to provided source URLs. ' +
    "Weave recommended terms in naturally; do not over-repeat any single term. Return ONLY the JSON array.\n" +
    BLOCK_SPEC;
  const user = [
    `Section to write: ## ${section?.heading ?? ""} (~${section?.words ?? 400}w)`,
    ...(section?.points ?? []).map((p) => `- ${p}`),
    "",
    priorHeadings.length ? `Already written (do NOT repeat): ${priorHeadings.join("; ")}` : "This is the first section.",
    "",
    "Recommended terms to include (use naturally, do not stuff):",
    brief.termClusters.flatMap((c) => c.terms).slice(0, 30).join(", "),
    factsBlock(sourceFacts),
  ].join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/* — W4 (section-by-section): rewrite ONE section — */

export function buildSectionRewritePrompt(
  brief: Brief,
  params: ArticleParams,
  sectionBlocks: ContentBlock[],
  critique: Critique,
  sectionHeading: string,
  priorHeadings: string[],
): { system: string; user: string; cachePrefix: string } {
  const system =
    "You are an expert SEO writer revising ONE section of an article. Apply the critique points that pertain to this " +
    "section, keep what already works, and return ONLY this section's revised ContentBlocks as a JSON array. " +
    "Do not repeat content from the earlier sections listed under 'Already written'. Return ONLY the JSON array.\n" +
    BLOCK_SPEC;
  const user = [
    `Section being revised: ${sectionHeading}`,
    priorHeadings.length ? `Already written (do NOT repeat): ${priorHeadings.join("; ")}` : "",
    "",
    "Critique to apply:",
    critique.missingTerms.length ? `- Ensure these terms appear where natural: ${critique.missingTerms.join(", ")}` : "",
    critique.issues.length ? `- Fix these issues: ${critique.issues.join(" | ")}` : "",
    "",
    "Current section (markdown):",
    blocksToMarkdown(sectionBlocks),
  ].filter(Boolean).join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/** Per-section fake output (fake-LLM mode) — a small chunk, NOT the whole article. */
export const FAKE_SECTION_DRAFT: string = JSON.stringify([
  { type: "h2", text: "Section heading" },
  { type: "p", text: "A direct answer, then a concrete detail for this section." },
]);
```

Note: `Critique` and `SourceFact` types are already declared/exported in this file; `blocksToMarkdown` is already imported at the top. No new imports needed.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/kalamai/writing.test.ts` → PASS.
Run: `npx tsc --noEmit -p tsconfig.json` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/writing.ts src/lib/kalamai/writing.test.ts
git commit -m "feat(kalamai): per-section draft + rewrite prompt builders"
```

---

### Task 2: Section-by-section `stepDraft` (writing-server.ts)

**Files:**
- Modify: `src/lib/kalamai/writing-server.ts` (`StageState` type, imports, `stepDraft`)

**Interfaces consumed:** `buildSectionDraftPrompt`, `FAKE_SECTION_DRAFT` (Task 1); existing `runText`, `parseWithRepair`, `loadBrief`, `loadSourceFacts`, `mergeState`, `logCall`.

- [ ] **Step 1: Extend `StageState` + imports**

In `src/lib/kalamai/writing-server.ts`, extend the `StageState` type:
```ts
type StageState = {
  plan?: SectionPlan;
  meta?: ArticleMeta;
  blocks?: ContentBlock[];
  critique?: Critique;
  sectionBlocks?: ContentBlock[][];
  draftCursor?: number;
  rewriteCursor?: number;
};
```

Update the import from `./writing` to include the new builder + fixture (add to the existing import list): `buildSectionDraftPrompt`, `FAKE_SECTION_DRAFT`. (Leave `buildDraftPrompt`/`FAKE_DRAFT` in the import for now; Task 3/cleanup removes them if unused.)

- [ ] **Step 2: Replace `stepDraft` with a per-section loop**

Replace the entire existing `stepDraft` function with:

```ts
// W2 — draft ONE section per call, accumulating in stage_state.sectionBlocks. Stays
// at 'outlining' until every section is drafted, so no single LLM call can exceed the
// 60s route ceiling. Then assembles blocks and advances to 'drafting'.
async function stepDraft(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const brief = await loadBrief(db, a);
  const plan = a.stage_state.plan!;
  const sections = plan.sections ?? [];
  const facts = await loadSourceFacts(db, a.analysis_id);
  const sectionBlocks = a.stage_state.sectionBlocks ? [...a.stage_state.sectionBlocks] : [];
  const cursor = a.stage_state.draftCursor ?? 0;

  if (sections.length === 0) {
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { blocks: [], sectionBlocks: [], draftCursor: 0 }), status: "drafting", progress: 40 }).eq("id", a.id);
    return { status: "drafting", progress: 40 };
  }

  const priorHeadings = sections.slice(0, cursor).map((s) => s.heading);
  const { system, user, cachePrefix } = buildSectionDraftPrompt(brief, a.params, plan, cursor, priorHeadings, facts);
  const SECTION_TOKENS = 8000; // one section is small; ample headroom, finishes well under 60s
  const { text, usage } = await runText({ system, user, cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
  await logCall(db, a, "W2", usage);
  const blocks = await parseWithRepair(text, async () => {
    const r = await runText({ system, user: user + "\n\nReturn ONLY a valid JSON array of ContentBlocks.", cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
    return r.text;
  });
  sectionBlocks[cursor] = blocks;
  const nextCursor = cursor + 1;
  const progress = 15 + Math.round((25 * nextCursor) / sections.length);

  if (nextCursor < sections.length) {
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, draftCursor: nextCursor }), progress }).eq("id", a.id);
    return { status: "outlining", progress };
  }
  const assembled = sectionBlocks.flat();
  await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, draftCursor: nextCursor, blocks: assembled }), status: "drafting", progress: 40 }).eq("id", a.id);
  return { status: "drafting", progress: 40 };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json` → exit 0.
(The machine test is updated in Task 4; a bare `vitest` run now may fail on the old single-call assumption — that's expected and fixed in Task 4. Do NOT edit tests here.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/kalamai/writing-server.ts
git commit -m "feat(kalamai): draft one section per step, cursor in stage_state"
```

---

### Task 3: Section-by-section `stepRewrite` (writing-server.ts)

**Files:**
- Modify: `src/lib/kalamai/writing-server.ts` (`stepRewrite`, imports)

**Interfaces consumed:** `buildSectionRewritePrompt`, `FAKE_SECTION_DRAFT` (Task 1); `stage_state.sectionBlocks` populated by Task 2.

- [ ] **Step 1: Add the rewrite builder to imports**

In the `./writing` import list in `writing-server.ts`, add `buildSectionRewritePrompt`. Remove `buildRewritePrompt` and `FAKE_REWRITE` from the import ONLY if nothing else references them after this task (grep first: `grep -n "buildRewritePrompt\|FAKE_REWRITE" src/lib/kalamai/writing-server.ts`); if the only references were in the old `stepRewrite` you are replacing, drop them from the import.

- [ ] **Step 2: Replace `stepRewrite` with a per-section loop**

Replace the entire existing `stepRewrite` with:

```ts
// W4 — rewrite ONE section per call when the critique failed, mirroring stepDraft so a
// rewrite can't exceed the 60s ceiling either. If the critique passed, skip straight to
// scoring (no spend). Stays at 'reviewing' until all sections are rewritten.
async function stepRewrite(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const critique = a.stage_state.critique!;
  if (critique.ok) {
    await db.from("kalamai_articles").update({ status: "scoring", progress: 85 }).eq("id", a.id);
    return { status: "scoring", progress: 85 };
  }

  const brief = await loadBrief(db, a);
  const plan = a.stage_state.plan!;
  const sections = plan.sections ?? [];
  const sectionBlocks = a.stage_state.sectionBlocks ? [...a.stage_state.sectionBlocks] : [];
  const cursor = a.stage_state.rewriteCursor ?? 0;

  if (sections.length === 0 || cursor >= sections.length) {
    const assembled = sectionBlocks.flat();
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { blocks: assembled }), status: "scoring", progress: 85 }).eq("id", a.id);
    return { status: "scoring", progress: 85 };
  }

  const priorHeadings = sections.slice(0, cursor).map((s) => s.heading);
  const { system, user, cachePrefix } = buildSectionRewritePrompt(brief, a.params, sectionBlocks[cursor] ?? [], critique, sections[cursor].heading, priorHeadings);
  const SECTION_TOKENS = 8000;
  const { text, usage } = await runText({ system, user, cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
  await logCall(db, a, "W4", usage);
  sectionBlocks[cursor] = await parseWithRepair(text, async () => {
    const r = await runText({ system, user: user + "\n\nReturn ONLY a valid JSON array of ContentBlocks.", cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
    return r.text;
  });
  const nextCursor = cursor + 1;
  const progress = 60 + Math.round((25 * nextCursor) / sections.length);

  if (nextCursor < sections.length) {
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, rewriteCursor: nextCursor }), progress }).eq("id", a.id);
    return { status: "reviewing", progress };
  }
  const assembled = sectionBlocks.flat();
  await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, rewriteCursor: nextCursor, blocks: assembled }), status: "scoring", progress: 85 }).eq("id", a.id);
  return { status: "scoring", progress: 85 };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/kalamai/writing-server.ts
git commit -m "feat(kalamai): rewrite one section per step when critique fails"
```

---

### Task 4: Machine test for the multi-call flow + full suite + PR

**Files:**
- Modify: `src/lib/kalamai/writing-server.test.ts`

**Interfaces consumed:** `runArticleStep` (drives the machine on the in-memory mock with `KALAMAI_FAKE_LLM=1`).

- [ ] **Step 1: Read the current test to learn its harness**

Read `src/lib/kalamai/writing-server.test.ts` fully. Note how it seeds a `kalamai_analyses` row with a `report.brief`, seeds a `kalamai_articles` row (with `params`, `status: "queued"`, `stage_state: {}`), and how it invokes `runArticleStep`. Reuse that exact seeding + mock.

- [ ] **Step 2: Update / add the driving test**

Ensure there is a test that drives the machine to completion by looping `runArticleStep` until terminal, and asserts the section-by-section behavior. If an existing test asserted the OLD single-call drafting (e.g. expected `drafting` after exactly one poke from `outlining`), update it to the loop form below rather than deleting coverage:

```ts
it("drafts section-by-section and completes with an assembled article", async () => {
  // seed analysis with a brief + article (reuse the file's existing helpers/mock)
  const articleId = /* seed as the existing tests do, status 'queued', stage_state {} */;

  const seen: string[] = [];
  let guard = 0;
  let res = { status: "queued", progress: 0 };
  do {
    res = await runArticleStep(articleId);
    seen.push(res.status);
  } while (res.status !== "complete" && res.status !== "failed" && ++guard < 40);

  expect(res.status).toBe("complete");
  // stayed at 'outlining' for more than one poke while drafting each section (FAKE_OUTLINE has 3)
  expect(seen.filter((s) => s === "outlining").length).toBeGreaterThanOrEqual(3);

  // assembled article is non-empty
  const article = /* read the article row from the mock store */;
  expect((article.blocks as unknown[]).length).toBeGreaterThan(0);
});
```

Fill the seeding/read `/* ... */` spots using the same mechanisms the existing tests in this file already use (the in-memory `store` + seed rows). Keep the fake-LLM `beforeAll` as is.

If the file has a forced-critique-fail path helper, also assert the rewrite loop reaches `complete`; if not, do not invent new infrastructure — the draft-loop test above is the required coverage.

- [ ] **Step 3: Run the writing tests**

Run: `npx vitest run src/lib/kalamai/writing-server.test.ts src/lib/kalamai/writing.test.ts`
Expected: PASS (draft loop reaches `complete`, ≥3 `outlining` pokes).

- [ ] **Step 4: Full kalamai suite + typecheck**

Run: `npx vitest run src/lib/kalamai` → all pass.
Run: `npx tsc --noEmit -p tsconfig.json` → exit 0.

- [ ] **Step 5: Commit + PR**

```bash
git add src/lib/kalamai/writing-server.test.ts
git commit -m "test(kalamai): drive section-by-section article machine to completion"
```
Push the branch and open a PR to `main` with a `Tweet:` line. Do NOT merge — wait for owner deploy OK, then live-verify a long article completes.

---

## Self-Review

**Spec coverage:**
- W2 batched section-by-section → Task 2. ✅
- W4 batched section-by-section (skip when critique ok) → Task 3. ✅
- Cursors + sectionBlocks in `stage_state`, no migration → Tasks 2/3 (`StageState` + updates). ✅
- Per-section prompt builders + fake → Task 1. ✅
- Coherence via `priorHeadings` → Task 1 builders + Tasks 2/3 pass them. ✅
- Progress mapping (15→40 draft, 60→85 rewrite) → Tasks 2/3. ✅
- Status enum unchanged; `enforceWordCap` untouched → constraints honored (stepScore not modified). ✅
- Tests: pure builders (Task 1) + machine loop (Task 4). ✅

**Placeholder scan:** Task 4's seeding `/* ... */` intentionally defers to the file's existing seed/read helpers (which the implementer must read in Step 1) rather than duplicating them blindly — this is "match the existing harness," not an unspecified requirement. All prompt-builder and server-loop code is given in full.

**Type consistency:** `sectionBlocks: ContentBlock[][]`, `draftCursor`/`rewriteCursor: number` used identically in `StageState`, `stepDraft`, `stepRewrite`. Builder signatures in Task 1 match their call sites in Tasks 2/3 (arg order: draft = `(brief, params, plan, index, priorHeadings, facts)`; rewrite = `(brief, params, sectionBlocks, critique, heading, priorHeadings)`). `FAKE_SECTION_DRAFT` used as the `fake` in both server loops.
