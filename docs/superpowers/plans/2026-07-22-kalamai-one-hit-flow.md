# KalamAI One-Hit Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn KalamAI's two-hit flow into one hit on one page — the user fills six inputs, hits Generate, and watches the keyword become a finished SEO blog (analysis → article, back-to-back), with a live progress + SEO-tips layer and social-optimized OG meta.

**Architecture:** Approach A — a client orchestrator drives the two EXISTING step-machines (`/api/kalamai/step`, `/api/kalamai/article-step`) end-to-end on one page; no backend state-machine merge. The only new server work is adding OG title/description to the writing engine's output. Article params ride from the Step-0 form to the orchestrator via `sessionStorage` keyed by analysis id.

**Tech Stack:** Next.js (App Router, RSC + client components), TypeScript, Supabase (Postgres, `kalamai_analyses` / `kalamai_articles` JSON columns), Vitest, Tailwind.

## Global Constraints

- Design: monochrome, no emojis, fonts Jakarta + Poppins (existing tokens/components only).
- Word count: keep the hard cap at **2200** (`enforceWordCap` unchanged); form range 1000–2200.
- No new dependencies. No DB migration (OG lives in the existing `kalamai_articles.meta` jsonb).
- Every change goes through the PR flow (branch off `origin/main`); a `Tweet:` line in the PR body per `docs/PR-TWEET.md`.
- Article backend already accepts `targetWords` (clamped 1000–2200), `tone`, `audience`, `brandFacts` — do NOT re-plumb these.
- Run tests on Windows via `npx vitest run <path>`; typecheck via `npx tsc --noEmit -p tsconfig.json`.

---

### Task 1: OG title/description in the writing engine

**Files:**
- Modify: `src/lib/kalamai/writing.ts` (`SectionPlan`, `ArticleMeta`, `OUTLINE_SCHEMA`, `buildOutlinePrompt`, `buildArticleMeta`, `FAKE_OUTLINE`)
- Modify: `src/lib/kalamai/writing-server.ts` (`stepScore` fallback meta literal)
- Test: `src/lib/kalamai/writing.test.ts`

**Interfaces:**
- Consumes: `Brief` (from `./brief`), existing `SectionPlan`, `ArticleMeta`.
- Produces:
  - `SectionPlan = { title: string; description: string; ogTitle: string; ogDescription: string; sections: {...}[] }`
  - `ArticleMeta = { title: string; description: string; ogTitle: string; ogDescription: string; jsonld: string }`
  - `buildArticleMeta(brief: Brief, plan: SectionPlan): ArticleMeta` (unchanged signature)

- [ ] **Step 1: Write the failing test**

Add to `src/lib/kalamai/writing.test.ts` (import `buildArticleMeta`, `FAKE_OUTLINE`, `type Brief` as already imported there; if `buildArticleMeta` isn't imported, add it to the existing import from `./writing`):

```ts
import { buildArticleMeta, FAKE_OUTLINE } from "./writing";

describe("buildArticleMeta — OG fields", () => {
  const brief = { metaTitles: ["Meta T"], metaDescriptions: ["Meta D"], schemaJsonLd: "{}" } as unknown as import("./brief").Brief;

  it("uses the plan's social-optimized OG title/description when present", () => {
    const plan = { ...FAKE_OUTLINE, ogTitle: "Punchy OG", ogDescription: "Shareable OG blurb" };
    const meta = buildArticleMeta(brief, plan);
    expect(meta.ogTitle).toBe("Punchy OG");
    expect(meta.ogDescription).toBe("Shareable OG blurb");
  });

  it("falls back to meta title/description when the model omits OG", () => {
    const plan = { ...FAKE_OUTLINE, ogTitle: "", ogDescription: "" };
    const meta = buildArticleMeta(brief, plan);
    expect(meta.ogTitle).toBe(meta.title);
    expect(meta.ogDescription).toBe(meta.description);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/writing.test.ts`
Expected: FAIL — `Property 'ogTitle' does not exist on type 'ArticleMeta'` (and/or the assertions fail).

- [ ] **Step 3: Write minimal implementation**

In `src/lib/kalamai/writing.ts`:

Extend the types:
```ts
export type SectionPlan = {
  title: string; // chosen meta/H1 title
  description: string; // meta description
  ogTitle: string; // social-optimized share title
  ogDescription: string; // social-optimized share description
  sections: { heading: string; points: string[]; words: number }[];
};

export type ArticleMeta = { title: string; description: string; ogTitle: string; ogDescription: string; jsonld: string };
```

Fill OG with a fallback in `buildArticleMeta`:
```ts
export function buildArticleMeta(brief: Brief, plan: SectionPlan): ArticleMeta {
  const title = plan.title || brief.metaTitles[0] || "";
  const description = plan.description || brief.metaDescriptions[0] || "";
  return {
    title,
    description,
    ogTitle: plan.ogTitle || title,
    ogDescription: plan.ogDescription || description,
    jsonld: brief.schemaJsonLd || "",
  };
}
```

Add OG to `OUTLINE_SCHEMA` (required + properties):
```ts
export const OUTLINE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "ogTitle", "ogDescription", "sections"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    ogTitle: { type: "string" },
    ogDescription: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "points", "words"],
        properties: {
          heading: { type: "string" },
          points: { type: "array", items: { type: "string" } },
          words: { type: "integer" },
        },
      },
    },
  },
};
```

Add the OG instruction to `buildOutlinePrompt`'s `system` string (append this sentence before `"Do not invent facts."`):
```ts
    "Also produce ogTitle and ogDescription — social-share variants that are punchier and more curiosity-driven than the meta title/description (ogTitle <= 70 chars; ogDescription 110-160 chars). " +
```

Update `FAKE_OUTLINE`:
```ts
export const FAKE_OUTLINE: SectionPlan = {
  title: "Digital Marketing Company in Nagpur",
  description: "A results-driven digital marketing company in Nagpur offering SEO, PPC, and content marketing for local businesses that grow.",
  ogTitle: "Grow Your Nagpur Business Online",
  ogDescription: "SEO, PPC, and content that actually move the needle for local Nagpur businesses — here's how to pick the right partner.",
  sections: [
    { heading: "What a digital marketing company in Nagpur does", points: ["Core services", "Who it's for"], words: 400 },
    { heading: "How to choose an agency", points: ["Questions to ask", "Pricing"], words: 400 },
    { heading: "Local SEO for Nagpur businesses", points: ["Google Business Profile", "Local citations"], words: 400 },
  ],
};
```

In `src/lib/kalamai/writing-server.ts` `stepScore`, extend the fallback meta literal so it satisfies `ArticleMeta`:
```ts
  const meta = a.stage_state.meta ?? { title: "", description: "", ogTitle: "", ogDescription: "", jsonld: "" };
```

- [ ] **Step 4: Run test + typecheck to verify pass**

Run: `npx vitest run src/lib/kalamai/writing.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0 (no errors — confirms `score.ts` and any other `ArticleMeta` consumers still compile).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/writing.ts src/lib/kalamai/writing-server.ts src/lib/kalamai/writing.test.ts
git commit -m "feat(kalamai): social-optimized OG title/description in the article writer"
```

---

### Task 2: 100 SEO tips (data + guard test)

**Files:**
- Create: `src/lib/kalamai/seo-tips.ts`
- Test: `src/lib/kalamai/seo-tips.test.ts`

**Interfaces:**
- Produces: `export const SEO_TIPS: readonly string[]` — exactly 100 unique, non-empty one-line tips.

- [ ] **Step 1: Write the failing test**

Create `src/lib/kalamai/seo-tips.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SEO_TIPS } from "./seo-tips";

describe("SEO_TIPS", () => {
  it("has exactly 100 tips", () => {
    expect(SEO_TIPS).toHaveLength(100);
  });
  it("are all non-empty single-line strings", () => {
    for (const t of SEO_TIPS) {
      expect(t.trim().length).toBeGreaterThan(0);
      expect(t).not.toContain("\n");
    }
  });
  it("are unique", () => {
    expect(new Set(SEO_TIPS).size).toBe(SEO_TIPS.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/kalamai/seo-tips.test.ts`
Expected: FAIL — cannot resolve `./seo-tips`.

- [ ] **Step 3: Write the data file**

Create `src/lib/kalamai/seo-tips.ts` with a `SEO_TIPS` array of **exactly 100** distinct one-line tips. Author real, useful, on-brand (answer-engine/AEO-aware) tips — no emojis, no trailing periods required, each under ~90 chars. Example shape (fill to 100 unique lines):

```ts
/** One-line SEO/AEO tips shown while an analysis + article generate. Static, no cost. */
export const SEO_TIPS: readonly string[] = [
  "Answer the query in the first sentence — engines lift direct answers into AI overviews",
  "One H1 per page; let H2s map to the questions real people ask",
  "Front-load the keyword in your title, but write the title for a human first",
  "A table beats three paragraphs when you're comparing options",
  "Internal links pass context, not just authority — link to your best related answer",
  // ... continue to 100 unique tips
];
```

(The implementer writes all 100. Keep them factual and non-repetitive; the test enforces count + uniqueness.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/kalamai/seo-tips.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kalamai/seo-tips.ts src/lib/kalamai/seo-tips.test.ts
git commit -m "feat(kalamai): 100 one-line SEO tips for the generation screen"
```

---

### Task 3: Unified Step-0 form (six inputs + params stash)

**Files:**
- Modify: `src/components/kalamai/new-analysis-form.tsx`
- Reference (do not modify): `src/components/kalamai/new-article-form.tsx` (source of the field markup to fold in)

**Interfaces:**
- Consumes: `POST /api/kalamai/analyses` → `{ id }` (existing).
- Produces: on submit, writes `sessionStorage["kalamai-article-params:" + id] = JSON.stringify({ targetWords, tone, audience, brandFacts })`, then `router.push("/tools/kalamai/a/" + id)`. Task 4's orchestrator reads that key.

- [ ] **Step 1: Extend the form state + fields**

Replace the body of `NewAnalysisForm` in `src/components/kalamai/new-analysis-form.tsx` so it collects all six inputs. Add the constants and state (fold in from `new-article-form.tsx`), keeping length options WITHIN the 2200 cap:

```ts
const TONES = ["professional", "conversational", "authoritative", "friendly"];
const LENGTHS = [
  { value: 1000, label: "~1,000 words" },
  { value: 1500, label: "~1,500 words" },
  { value: 2000, label: "~2,000 words" },
  { value: 2200, label: "~2,200 words (max)" },
];
```

State inside the component:
```ts
const [keyword, setKeyword] = useState("");
const [country, setCountry] = useState("IN");
const [targetWords, setTargetWords] = useState(1500);
const [tone, setTone] = useState("professional");
const [audience, setAudience] = useState("");
const [brandFacts, setBrandFacts] = useState("");
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string | null>(null);
```

- [ ] **Step 2: Stash params on submit, then hand off**

Replace `submit`:
```ts
async function submit(e: React.FormEvent) {
  e.preventDefault();
  if (busy) return;
  setBusy(true);
  setError(null);
  try {
    const res = await fetch("/api/kalamai/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: keyword.trim(), country, locale: "en" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    sessionStorage.setItem(
      `kalamai-article-params:${data.id}`,
      JSON.stringify({ targetWords, tone, audience: audience.trim(), brandFacts: brandFacts.trim() }),
    );
    router.push(`/tools/kalamai/a/${data.id}`);
  } catch {
    setError("Network error. Try again.");
    setBusy(false);
  }
}
```

- [ ] **Step 3: Render the six fields**

Update the JSX: keep Keyword + Country row, then add Length + Tone row, Audience input, Brand-facts textarea (copy the markup verbatim from `new-article-form.tsx` lines 54–79, wiring to the state above), and change the button label to `Generate article`. Reuse the existing `inputClass`.

- [ ] **Step 4: Verify it compiles + renders**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.
Manual: `npm run dev` (or the project's dev command), open `/tools/kalamai`, confirm all six fields render and submitting still navigates to `/tools/kalamai/a/<id>`. (Full run verified in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add src/components/kalamai/new-analysis-form.tsx
git commit -m "feat(kalamai): single Step-0 form with all six inputs + param stash"
```

---

### Task 4: RunOrchestrator — one page, one journey

**Files:**
- Create: `src/components/kalamai/run-orchestrator.tsx`
- Modify: `src/app/tools/kalamai/a/[id]/page.tsx` (use the orchestrator for the non-terminal branch; keep the completed-report + failed branches)

**Interfaces:**
- Consumes: `POST /api/kalamai/step` → `{ status, progress }`; `POST /api/kalamai/articles` (body `{ analysisId, targetWords, tone, audience, brandFacts }`) → `{ id }` or `{ error }`; `POST /api/kalamai/article-step` → `{ status, progress }`; `sessionStorage["kalamai-article-params:" + id]`; `SEO_TIPS` from `@/lib/kalamai/seo-tips`.
- Produces: renders progress + tips while running; on both machines complete, links to `/tools/kalamai/w/<articleId>`.

- [ ] **Step 1: Build the orchestrator component**

Create `src/components/kalamai/run-orchestrator.tsx`. It mirrors `AnalysisPoller`'s poke-until-terminal loop (see `src/components/kalamai/analysis-poller.tsx`), then chains the article. Full component:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SEO_TIPS } from "@/lib/kalamai/seo-tips";

type Params = { targetWords: number; tone: string; audience: string; brandFacts: string };
const DEFAULT_PARAMS: Params = { targetWords: 1500, tone: "professional", audience: "", brandFacts: "" };

const PHASES = [
  { key: "research", label: "Researching competitors" },
  { key: "write", label: "Writing your article" },
  { key: "done", label: "Done" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function poke(url: string, body: unknown): Promise<{ status: string; progress: number } | null> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return null;
  return (await res.json()) as { status: string; progress: number };
}

export function RunOrchestrator({ analysisId, initialStatus }: { analysisId: string; initialStatus: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<"research" | "write" | "done" | "failed">("research");
  const [progress, setProgress] = useState(5);
  const [note, setNote] = useState<string | null>(null);
  const [tip, setTip] = useState(0);

  // Rotate SEO tips while anything is running.
  useEffect(() => {
    if (phase === "done" || phase === "failed") return;
    const t = setInterval(() => setTip((i) => (i + 1) % SEO_TIPS.length), 4500);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      // 1) Drive the analysis to complete.
      let st = initialStatus;
      while (!cancelled && st !== "complete" && st !== "failed") {
        const data = await poke("/api/kalamai/step", { id: analysisId });
        if (cancelled) return;
        if (!data) { setNote("Hit a snag, retrying…"); await sleep(1500); continue; }
        st = data.status; setProgress(Math.min(45, data.progress)); setNote(null);
      }
      if (cancelled) return;
      if (st === "failed") { setPhase("failed"); return; }

      // 2) Auto-create the article from stashed params.
      setPhase("write"); setProgress(50);
      let params = DEFAULT_PARAMS;
      try {
        const raw = sessionStorage.getItem(`kalamai-article-params:${analysisId}`);
        if (raw) params = { ...DEFAULT_PARAMS, ...(JSON.parse(raw) as Partial<Params>) };
      } catch { /* use defaults */ }
      const createRes = await fetch("/api/kalamai/articles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, ...params }),
      });
      const created = await createRes.json().catch(() => ({}));
      if (cancelled) return;
      if (!createRes.ok || !created.id) { setNote(created.error ?? "Could not start the article."); setPhase("failed"); return; }
      const articleId = created.id as string;

      // 3) Drive the article to complete.
      let ast = "queued";
      while (!cancelled && ast !== "complete" && ast !== "failed") {
        const data = await poke("/api/kalamai/article-step", { id: articleId });
        if (cancelled) return;
        if (!data) { setNote("Writing…"); await sleep(1500); continue; }
        ast = data.status; setProgress(50 + Math.round(data.progress / 2)); setNote(null);
      }
      if (cancelled) return;
      if (ast === "failed") { setPhase("failed"); return; }

      // 4) Done — send them to the finished article.
      setPhase("done"); setProgress(100);
      router.push(`/tools/kalamai/w/${articleId}`);
    })();

    return () => { cancelled = true; };
  }, [analysisId, initialStatus, router]);

  if (phase === "failed") {
    return (
      <div className="rounded-card border border-border bg-card p-6">
        <p className="text-sm font-medium text-danger">This run failed.</p>
        <p className="mt-1 text-sm text-muted-foreground">{note ?? "Your quota was not charged. Start a new one from the KalamAI home."}</p>
      </div>
    );
  }

  const activeIndex = phase === "done" ? 2 : phase === "write" ? 1 : 0;
  return (
    <div className="rounded-card border border-border bg-card p-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(5, progress))}%` }} />
      </div>
      <ol className="mt-5 space-y-2">
        {PHASES.map((p, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
          return (
            <li key={p.key} className="flex items-center gap-3 text-sm">
              <span className={"flex size-5 items-center justify-center rounded-full border text-[10px] tabular-nums " + (state === "done" ? "border-foreground bg-foreground text-background" : state === "active" ? "border-foreground text-foreground" : "border-border text-muted-foreground")}>{i + 1}</span>
              <span className={state === "todo" ? "text-muted-foreground" : "text-foreground"}>{p.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 rounded-input border border-border bg-background p-3">
        <p className="text-xs font-medium text-muted-foreground">SEO tip</p>
        <p className="mt-1 text-sm text-foreground">{SEO_TIPS[tip]}</p>
      </div>
      {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the run page**

In `src/app/tools/kalamai/a/[id]/page.tsx`, replace the import of `AnalysisPoller` with `RunOrchestrator`, and swap the non-terminal branch. Change:

```tsx
import { AnalysisPoller } from "@/components/kalamai/analysis-poller";
```
to:
```tsx
import { RunOrchestrator } from "@/components/kalamai/run-orchestrator";
```

and change the final branch:
```tsx
          ) : (
            <AnalysisPoller id={a.id} initialStatus={a.status} initialProgress={a.progress ?? 0} />
          )}
```
to:
```tsx
          ) : (
            <RunOrchestrator analysisId={a.id} initialStatus={a.status} />
          )}
```

Leave the `a.status === "complete"` branch (report + `NewArticleForm`) untouched — it's the escape hatch / re-generate path for an already-finished analysis, and the deferred analysis-only route.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 4: Verify the full run offline**

Set `KALAMAI_FAKE_SERP=1` and `KALAMAI_FAKE_LLM=1` in `.env.local`, run the dev server, open `/tools/kalamai`, fill the form, hit Generate. Confirm: the page shows the two-phase timeline + rotating SEO tips, advances Researching → Writing, then redirects to `/tools/kalamai/w/<id>` with a rendered article. Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/kalamai/run-orchestrator.tsx "src/app/tools/kalamai/a/[id]/page.tsx"
git commit -m "feat(kalamai): one-hit RunOrchestrator drives analysis then article on one page"
```

---

### Task 5: Show meta + OG on the article page

**Files:**
- Modify: `src/app/tools/kalamai/w/[id]/page.tsx`

**Interfaces:**
- Consumes: `article.meta` (now `{ title, description, ogTitle, ogDescription, jsonld }` from Task 1).
- Produces: a small "Search & social" panel rendering the four fields when present.

- [ ] **Step 1: Widen the page's local meta type**

In `src/app/tools/kalamai/w/[id]/page.tsx`, change:
```tsx
type ArticleMeta = { title?: string; description?: string; jsonld?: string };
```
to:
```tsx
type ArticleMeta = { title?: string; description?: string; ogTitle?: string; ogDescription?: string; jsonld?: string };
```

- [ ] **Step 2: Render the meta/OG panel**

Inside the completed-article branch (near the `ArticleBody` render, after `<ArticleBody blocks={blocks} />`), add a panel. Insert:
```tsx
{(meta.title || meta.ogTitle) && (
  <div className="mt-8 rounded-card border border-border bg-card p-6">
    <p className="text-sm font-medium text-foreground">Search &amp; social</p>
    <dl className="mt-4 space-y-3 text-sm">
      {meta.title && (<div><dt className="text-xs font-medium text-muted-foreground">Meta title</dt><dd className="text-foreground">{meta.title}</dd></div>)}
      {meta.description && (<div><dt className="text-xs font-medium text-muted-foreground">Meta description</dt><dd className="text-foreground">{meta.description}</dd></div>)}
      {meta.ogTitle && (<div><dt className="text-xs font-medium text-muted-foreground">OG title</dt><dd className="text-foreground">{meta.ogTitle}</dd></div>)}
      {meta.ogDescription && (<div><dt className="text-xs font-medium text-muted-foreground">OG description</dt><dd className="text-foreground">{meta.ogDescription}</dd></div>)}
    </dl>
  </div>
)}
```

(Place it inside the same conditional block that renders `ArticleBody`, so it only shows for a completed article. Match the surrounding indentation/JSX structure.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 4: Verify**

With the fake-mode run from Task 4, confirm the finished `/w/<id>` page shows the "Search & social" panel with all four fields (fake OG values from `FAKE_OUTLINE`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/tools/kalamai/w/[id]/page.tsx"
git commit -m "feat(kalamai): show meta + OG title/description on the article page"
```

---

### Task 6: Full-suite green + PR

**Files:** none (verification + PR)

- [ ] **Step 1: Run the kalamai suite + typecheck**

Run: `npx vitest run src/lib/kalamai`
Expected: all pass (existing 101 + the new OG + seo-tips cases).
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 2: Open the PR**

Push the branch and open a PR to `main` with a `Tweet:` line (per `docs/PR-TWEET.md`), summarizing: one-hit keyword→article flow, live tips, OG meta. Do NOT merge — wait for owner deploy OK (auto-deploy is unreliable; verify prod after merge).

---

## Self-Review

**Spec coverage:**
- Six Step-0 inputs → Task 3 (form) + backend already accepts them. ✅
- One hit / one page / auto chain → Task 4 (RunOrchestrator). ✅
- Progress bars while working → Task 4 (two-phase timeline + bar). ✅
- 100 SEO tips while building → Task 2 (data) + Task 4 (rotator). ✅
- Full blog (H1/p/H2/table/H3/conclusion) → existing writer/`ArticleBody` (no change needed). ✅
- Meta title + description → existing (`buildArticleMeta`); surfaced in Task 5. ✅
- OG title + description → Task 1 (generate/store) + Task 5 (display). ✅
- Keep 2200 cap → Global Constraints + Task 3 length options; `enforceWordCap` untouched. ✅
- No migration → OG in existing `meta` jsonb. ✅

**Placeholder scan:** Task 2 Step 3 legitimately asks the implementer to author 100 tips (data authoring, not a code placeholder) with a guard test enforcing count/uniqueness; every code step shows full code.

**Type consistency:** `SectionPlan` and `ArticleMeta` gain `ogTitle`/`ogDescription` in Task 1; the `stepScore` fallback literal (Task 1) and the page's local `ArticleMeta` (Task 5) are both widened to match; orchestrator's `Params` matches the articles route body. Consistent.
