# SEO + AI Visibility Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public `/tools/seo-audit` tool into a fast, credible **SEO + AI-search visibility** lead-generation audit — 50% traditional SEO, 50% AEO — that crawls a handful of important pages, produces two stable deterministic scores instantly, gates a deep LLM-powered opportunity report behind an email, and saves qualified lead data.

**Architecture:** Async job machine mirroring the proven KalamAI pattern (`seo_audits` DB row + `/step` route polled by the client + single-flight lock + status states). Deterministic scoring runs free/instantly; the expensive LLM AEO pass runs only after the email gate. Reuses KalamAI's SSRF-safe fetch, polite crawler+robots, Readability extraction, LLM helpers (Haiku for extraction, Sonnet 5 for synthesis), and events. The internal `/admin/seo` engine (`scorePage`) is left untouched — the public tool gets its own engine.

**Tech Stack:** Next.js (this repo's fork — read `node_modules/next/dist/docs/` before touching framework APIs), TypeScript, Supabase (service-role writes, RLS), `@anthropic-ai/sdk` (via `src/lib/kalamai/llm.ts`), linkedom + @mozilla/readability, Vitest.

**Spec:** The user's 32-point brief in the conversation that opened this work (product objective, two scores, evidence-based findings, email flow, lead data, UI/report design, Google-accuracy constraints). This plan argues from that brief.

## Global Constraints

- **Two stable scores, 50/50.** `SEO /100` and `AI Visibility /100`, `Overall = round(seo*0.5 + ai*0.5)`. Both shown prominently, never hidden behind one number.
- **Scores are deterministic and do not change after the email gate.** The email unlocks *depth* (findings, opportunities, topic map, page-level detail), not a different score. No bait-and-switch (spec §18, §29).
- **LLM cost is gated to leads.** No LLM call before the email is captured. Pre-email = deterministic + observable signals only.
- **Model split:** Haiku for high-volume per-page extraction, Sonnet 5 (`KALAMAI_MODEL`) for final synthesis. Reuse `runJson`/`runText` from `src/lib/kalamai/llm.ts`; honour `isFakeLlm()` so tests/dev cost nothing.
- **Google accuracy (spec §26).** No claim that schema/FAQ/llms.txt guarantees rankings or AI citations. `llms.txt` is at most a 0-weight observation. AI-crawler access is a *readiness* signal, never a guarantee. Structured data is framed as "helps machines understand", requiring alignment with visible content.
- **Crawl budget.** Default max 12 pages per audit; homepage always included; large sites sampled by priority, never exhaustively crawled.
- **Reuse, don't rebuild.** `safeFetchHtml` (SSRF), `crawlUrl`+`RobotsCache`, `extractPage`, `parseHtml`, `mapWithConcurrency`, `llm.ts`, `logEvent`. Never import server-only modules into client components.
- **PR flow.** Each slice is its own PR off `origin/main`. Migrations are handed to the user as SQL to run (never applied directly). Every announceable PR needs a `Tweet:`/note line per `docs/PR-TWEET.md`.
- **Windows/OneDrive dev caveat:** Turbopack is unstable in the shared folder; verify UI via `next build`/`next start` + curl where the preview pane can't paint.

---

## File Structure

New module: `src/lib/seo-audit/` (public tool engine — distinct from `src/lib/seo/` which serves the internal site).

- `src/lib/seo-audit/types.ts` — shared types: `AuditPage`, `PageSignals`, `CategoryScore`, `AuditScores`, `Finding`, `AuditReport`, `AuditStatus`.
- `src/lib/seo-audit/discover.ts` — URL discovery: sitemap.xml + homepage internal links → prioritized, budgeted URL list. Classifier for page type.
- `src/lib/seo-audit/signals.ts` — per-page deterministic signal extraction (extends `parseHtml` + `extractPage`: canonical value, robots meta/header, alt coverage, status, links). Pure.
- `src/lib/seo-audit/scoring.ts` — deterministic weighted scoring model (SEO + AI Visibility categories). Pure, fully documented weights. The transparent core (spec §23).
- `src/lib/seo-audit/robots.ts` — full robots.txt parse incl. AI-crawler group detection (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) as a readiness signal.
- `src/lib/seo-audit/trust.ts` — deterministic E-E-A-T / trust-signal detection (about, contact, author, location, testimonials, dates).
- `src/lib/seo-audit/llm-extract.ts` — Haiku per-page extraction to the §24 structured shape.
- `src/lib/seo-audit/llm-synthesize.ts` — Sonnet synthesis → findings, opportunities, topic map, action plan.
- `src/lib/seo-audit/lead-score.ts` — internal lead-quality scoring (separate from SEO/AI scores).
- `src/lib/seo-audit/job-server.ts` — async job machine (`runStep`), mirrors `kalamai/analysis-server.ts`.
- `src/lib/seo-audit/events-server.ts` — `logAuditEvent` (mirrors `kalamai/events-server.ts`).
- `src/app/api/tools/seo-audit/start/route.ts` — create an audit job.
- `src/app/api/tools/seo-audit/step/route.ts` — advance the job one transition.
- `src/app/api/tools/seo-audit/[id]/route.ts` — GET job status + report.
- `src/app/api/tools/seo-audit/unlock/route.ts` — email capture → save lead → flip to LLM phase.
- `src/components/tools/seo-audit/*` — new client UI (hero, progress, free report, gate, deep report). Replaces `SeoAuditRunner` in `tool-runner.tsx`.
- `supabase/migrations/20260909000003_seo_audits.sql` — `seo_audits` + `seo_audit_events` tables + RLS.
- `src/lib/email/templates/seo-audit-report.tsx` (or `.ts`) — detailed report email.
- Tests colocated as `*.test.ts` next to each pure module.

The legacy path: keep `src/lib/tools/audit.ts` + old `POST /api/tools/seo-audit` importable so nothing else breaks, but the tool UI stops using it. Remove only once the new flow is verified in prod.

---

## Scoring Model (transparent, deterministic — spec §7, §23)

Each check has a weight. A category score = `round(earned / applicable_total * 100)`. Category scores roll up to the two headline scores by the category weights below. All weights live as named constants in `scoring.ts` with a comment justifying each. Deterministic inputs only — no randomness, no LLM in the headline scores.

### SEO Score /100 — category weights

| Category | Weight | Checks (per-page unless noted; aggregated across crawl) |
|---|---|---|
| Indexability | 22 | HTTP 200 (not error/soft-404); not `noindex` (meta or X-Robots-Tag); robots.txt allows the URL; canonical present and resolves to a crawled/consistent URL; in sitemap (site-level) |
| Technical health | 15 | HTTPS; no redirect chain (>1 hop) to reach the page; no internal links returning 4xx/5xx (sampled); consistent trailing-slash/canonical host |
| Metadata | 15 | Title present; title 30–60 chars; description present; description 120–160 chars; title unique across crawled pages; description unique across crawled pages |
| Headings | 10 | Exactly one H1; ≥1 H2; no skipped level (h1→h3 with no h2) |
| Structured data | 10 | ≥1 valid JSON-LD block; all blocks parse (no syntax errors); at least one type relevant to the page class |
| Content | 12 | Word count ≥ threshold for page class (home 150 / service 300 / article 500 / other 120); not near-duplicate of another crawled page |
| Internal linking | 10 | Page reachable from homepage within 2 hops (not orphan); important pages receive ≥2 internal links |
| Media & social | 6 | ≥80% of `<img>` have alt; OG title+image present; favicon present (site-level) |

### AI Visibility Score /100 — category weights (deterministic + observable only)

| Category | Weight | Checks |
|---|---|---|
| Machine readability & access | 18 | Readability extraction succeeds (real article body, not JS shell); junkRatio low; content present in raw HTML (not JS-only); robots.txt does **not** block major AI crawlers (readiness signal, framed as such) |
| Structured info & entities | 20 | Organization/Person/LocalBusiness schema present; `sameAs` links; Service/Product schema on commercial pages; consistent name/contact (NAP) across pages; breadcrumbs |
| Entity clarity (observable) | 12 | Homepage/about state what the org is + does + who-for (detected via headings/meta/schema presence, not LLM); org name consistent in title/schema |
| Trust & E-E-A-T signals | 22 | About page exists; contact info/physical address present; author/person info; testimonials/reviews/case-study pages; published/updated dates on content; external references |
| Topical breadth | 16 | Distinct topic clusters across crawled pages (heading/link-graph heuristic); commercial pages have supporting informational pages; not a single thin page |
| Answer structure | 12 | Pages use answer-friendly structure: question-style headings, lists/tables, concise lead paragraphs, definition patterns (regex/structure heuristics — the *depth* judgment is the LLM report, not this score) |

**Overall = round(SEO * 0.5 + AI * 0.5).** Colour bands reuse `scoreColor` from `src/lib/seo/constants.ts`.

### What the LLM adds (post-email, does NOT change scores)

- **Answerability findings:** for each important commercial page, the obvious buyer questions (discovered from the site's own content) and whether the page answers them (spec §5).
- **Citability findings:** which pages are extractable vs vague/promotional/context-dependent (spec §6).
- **Entity findings:** ambiguity in who/what/who-for/where/why (spec §7).
- **Topic map + gaps:** primary topic → core service → missing branches (cost/process/alternatives/etc) (spec §10).
- **Prioritized opportunities** (top 5–10) via `Impact × Confidence × Opportunity ÷ Effort` → Critical/High/Medium/Low buckets → Now/Next/Later action plan (spec §16, §22).
- Every finding: problem, why it matters, evidence, affected URLs, severity, recommended action (spec §15).

### Lead score (internal, spec §20 — separate from the two public scores)

`lead-score.ts` computes: SEO opportunity (100 − seo), AI opportunity (100 − ai), business-quality signals (commercial pages present, page count, freshness, contact/location present). Bucketed HOT / WARM / COLD. Stored, not shown to the visitor unless useful.

---

## Job Machine States

`queued → discovering → crawling → scoring → ready` (free report available here) → *[email captured]* → `analyzing → complete`.

- `discovering`: sitemap + homepage links → budgeted URL list (persist to row).
- `crawling`: fetch pages in batches of 6 with `mapWithConcurrency`, `extractPage` + `signals` each, persist.
- `scoring`: run deterministic `scoring.ts` → SEO + AI + overall + deterministic findings. Status `ready`, progress 100 for the free tier.
- `analyzing` (only after `unlock`): Haiku extract per important page (Sonnet synthesis) → findings/opportunities/topic map/action plan + lead score. Status `complete`.

Reuse KalamAI's single-flight `locked_at` claim + stale-lock reclaim + per-transition persist verbatim in shape.

---

## Slices (each = one PR off origin/main)

### Slice 1 — Schema + URL discovery + page classification
- Migration `20260909000003_seo_audits.sql` (tables + RLS below).
- `types.ts`, `discover.ts` (sitemap parse, internal-link discovery, normalize/dedupe, priority sort, budget cap), page classifier.
- Tests: sitemap with/without, relative links, off-domain filtered, budget cap, priority order, classifier per URL shape.
- Deliverable: given a homepage HTML + optional sitemap, returns the prioritized budgeted URL list with classes. No DB wiring yet beyond the migration.

### Slice 2 — Deterministic engine (signals + scoring + robots + trust)
- `signals.ts`, `robots.ts`, `trust.ts`, `scoring.ts`.
- Tests: each check fires on crafted HTML; category math; two-score rollup; dup title/desc across pages; orphan detection; AI-crawler block detection; trust detection; Google-accuracy (llms.txt weight 0).
- Deliverable: `scoreAudit(pages) → AuditScores + deterministic Finding[]`. Pure, fully tested.

### Slice 3 — Async job machine + API routes + SSRF/crawl wiring
- `job-server.ts` (`runStep`), `events-server.ts`, start/step/[id] routes, rate limit + `safeFetchHtml`/`crawlUrl` reuse.
- Tests: state transitions with a fake crawler; single-flight; budget; failure → `failed`.
- Deliverable: end-to-end free audit (queued→ready) over the API with a fake crawler, real scores persisted.

### Slice 4 — LLM AEO deep pass + lead capture + lead scoring
- `llm-extract.ts` (Haiku, §24 shape, fake fixtures), `llm-synthesize.ts` (Sonnet, findings/opportunities/topic map/action plan), `lead-score.ts`, `unlock/route.ts` (email → save lead → analyzing).
- Tests: extraction/synthesis in fake mode; lead-score buckets; unlock persists lead fields.
- Deliverable: ready→complete with full report in fake mode; lead row saved with all §19 fields.

### Slice 5 — UI (hero, real progress, free report, email gate, deep report)
- New `src/components/tools/seo-audit/` components; swap `SeoAuditRunner` to poll the job. Real progress states (spec §21), free report (two scores + 2–3 findings + opportunity summary), gate, deep report (§22). Analytics events (§30).
- Verify via `next build`/`next start` + curl (OneDrive caveat).
- Deliverable: full visitor flow working against the new API.

### Slice 6 — Report email + multi-site-type test suite + polish
- `seo-audit-report` email template via `sendTemplate`; unlock sends it. CTA to the paid service (§29).
- Fixture-based test suite across SaaS / local business / agency / ecommerce / publisher / professional services / portfolio / news (spec §31) exercising the deterministic engine end-to-end.
- Copy/registry update in `src/lib/data/tools.ts` (new positioning), analytics dashboards later.

---

## Database schema (Slice 1 migration — hand to user as SQL)

```sql
-- 20260909000003_seo_audits.sql
create table if not exists public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  domain text not null,
  status text not null default 'queued',        -- queued|discovering|crawling|scoring|ready|analyzing|complete|failed
  progress int not null default 0,
  report_status text not null default 'free',    -- free|unlocked
  locked_at timestamptz,
  page_budget int not null default 12,
  crawl_cursor int not null default 0,
  urls jsonb not null default '[]',               -- discovered {url,class,priority}[]
  pages jsonb not null default '[]',              -- crawled per-page signals
  scores jsonb,                                   -- {seo,ai,overall,color,categories}
  findings jsonb,                                 -- deterministic + (post-unlock) LLM findings
  report jsonb,                                   -- opportunities, topic map, action plan (post-unlock)
  email text,
  industry text,
  location text,
  page_count int,
  lead_score int,
  lead_bucket text,                               -- HOT|WARM|COLD
  crawl_ms int,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seo_audits_domain_idx on public.seo_audits (domain);
create index if not exists seo_audits_created_idx on public.seo_audits (created_at desc);

create table if not exists public.seo_audit_events (
  id bigint generated always as identity primary key,
  event text not null,                            -- audit_started|audit_completed|audit_failed|email_gate_viewed|email_submitted|report_generated|report_opened|cta_clicked
  audit_id uuid references public.seo_audits(id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.seo_audits enable row level security;
alter table public.seo_audit_events enable row level security;
-- No anon policies: all writes go through service-role (server routes). Reads of a
-- specific audit are served by the server route by id, not by direct PostgREST.
```

---

## Self-review notes
- Spec coverage: §1 audit (done, above) · §2–7 scores/model (scoring model) · §8 trust (trust.ts) · §9 schema (signals+scoring, Google-accuracy constraint) · §10 topic map (llm-synthesize) · §11 internal linking (signals orphan/link checks + LLM contextual recs) · §12 technical (signals) · §13 AI-crawler (robots.ts, readiness only) · §14 page discovery (discover.ts) · §15 evidence findings (Finding shape) · §16 prioritization (lead-score + synthesize) · §17 commercial framing (report/UI) · §18 gate (job states + unlock) · §19 lead data (schema) · §20 lead score (lead-score.ts) · §21 UI progress (Slice 5) · §22 report design (Slice 5) · §23 transparent scoring (scoring.ts constants) · §24 LLM structured intermediate (llm-extract shape) · §25 reuse KalamAI (file structure) · §26 Google accuracy (global constraint) · §28 performance (async, budget, batch, SERP-style cache by domain optional) · §29 email report (Slice 6) · §30 analytics (events) · §31 tests (Slice 6).
- Placeholders: none — schema and weights are concrete; per-check literal test code is written at the start of each slice's tasks during execution.
- Deviation from skill's full up-front bite-sized granularity: this is a solo-owner build executed inline by the author, not handed to a zero-context junior. Design decisions (schema, weights, module boundaries, interfaces) are locked here; fine-grained TDD steps are written per-slice at execution time. Recorded deliberately.
```
