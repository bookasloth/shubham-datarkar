# KalamAI — PLAN (v1)

Status: **Phase 1 / PLAN**. Awaiting approval before SPEC.
Category: content research + optimization (NeuronWriter / Surfer class).
Stack: Next.js (App Router) + Supabase (Postgres + pgvector) + Vercel serverless.
Models: **Claude `claude-sonnet-5`** (brief + draft passes 1 & 3), **Claude `claude-haiku-4-5`** (draft passes 2 & 4), **Gemini `text-embedding-004`** (embeddings only). **No Opus, any pass.** SERP: DataForSEO. No Inngest in v1.

**Economics reality [Q11 correction]:** KalamAI is member-facing (Kalamwala community), **not** a standalone paid product — **zero per-article revenue**. Plan for worst case: SaaS-shaped volume, no revenue offset. Therefore quota is **denominated in rupees of LLM spend, not analysis count**, enforced fail-closed at both global and per-user level, and is a **conversion mechanic**, not merely a guardrail.

This plan encodes the Phase-0 answers verbatim, including the five deviations:
D2 (rank v2 alongside v1, feature-flagged), D3 (no Inngest; corpus crawl = local script), D5 (k-means + silhouette k=6..16), D8 (500-kw corpus first, then 2000), D11 (quota gating, not feature gating). Constraints from Q4/Q6/Q7/Q9/Q12/Q13/Q14 are folded in as hard requirements, marked **[C]**.

---

## 1. System architecture

### 1.1 The nine modules, and which are in v1

```
                 REQUEST PIPELINE (per-user, online)                 OFFLINE (one-time, local)
                 ────────────────────────────────────                ─────────────────────────
  keyword ─▶ search ─▶ extract ─▶ distill ─▶ rank ─▶ craft ─▶ write   corpus-crawl script (500→2000 kw)
              │          │          │         │        │       │        │
           serp_cache  pages+     term_      score   brief   rescore   corpus_pages + chunks
           (weekly)    chunks     signals    +snap           button    (labeled top10 / 30–100)
```

v1 = **search (+cache), extract (upgrade), distill (log-odds + gate), rank (full), craft (exists), write (on-demand rescore)**.
Deferred to v2 = **phrase** (live in-editor suggestions), **deliver**'s WordPress push + GSC loop. v1 `deliver` = export + score-at-publish only.

### 1.2 Sync vs async — no new job runner **[D3]**

There is no Inngest, no cron, no queue in v1. Two execution contexts only:

| Context | Mechanism | Runs |
|---|---|---|
| **Request pipeline** | Existing client-poller → `/api/kalamai/step` (analysis) and `/article-step` (writing). One DB state transition per POST, single-flight `locked_at` CAS, 60s Vercel ceiling. | search, extract, distill, craft (analysis machine); draft (article machine); rank rescore is a **separate synchronous route** `/api/kalamai/score`. |
| **Offline corpus build** | Standalone Node script `scripts/kalamai/build-corpus.ts`, run locally, bulk-inserts to Supabase over the service role. Not deployed. | Background corpus crawl + embed + label; model training. |

Rationale for D3: the corpus crawl is a one-time job (500 then 2000 keywords). A job-runner dependency for something run by hand a few times is permanent maintenance for no benefit. Inngest enters in v2 when there is genuinely recurring async work (GSC sync, scheduled rescores).

**Serverless 60s ceiling — where it bites.** Embedding ~130 chunks/analysis cannot happen in one step. Chunk+embed is folded into the existing R2 crawl loop: each `crawling` step handles `BATCH=6` pages and embeds only that batch, so every step stays well under 60s. Distill (R3) reads already-stored chunks.

### 1.3 Where state lives

- **Job state**: `kalamai_analyses.status` / `kalamai_articles.status` state machines (already exist), extended for the new stages.
- **Expensive derived state, cached in Postgres**: `kalamai_serp_cache` (weekly SERP), `kalamai_corpus_pages` + `kalamai_chunks` (permanent background corpus + vectors), `kalamai_term_signals` (per-analysis log-odds — computed once, reused every rescore), cluster centroids (in `kalamai_analyses.report.clusters`).
- **Audit / drift**: `kalamai_score_snapshots` (every score ever computed, both scorers), `kalamai_llm_calls` (token/cost, exists), `kalamai_events` (analytics, exists).
- **Model**: `kalamai_rank_model` (coefficients + calibration + validation metrics, versioned).
- **Budget**: `kalamai_serp_budget` (one row per month, atomic counter, fail-closed).

### 1.4 Feature flag & shadow mode **[D2]**

Two scorers coexist:
- `v1_checklist` = existing `score.ts` (untouched).
- `v2_rank` = new module.

Env flag `KALAMAI_RANK_V2_DISPLAY` decides which score the **user sees**. Regardless of the flag, **v2 runs in shadow on every rescore and both results are written to `kalamai_score_snapshots`** so the harness and production traffic accumulate a head-to-head record. The old path is deleted only after v2 wins on AUC against the shared validation harness, and the delta is reported. Until then, v1 stays the displayed score and v2 is shadow-logged.

---

## 2. Supabase schema

pgvector required: `create extension if not exists vector;`. All new tables RLS-enabled; writes are service-role only (like the existing KalamAI tables); self-read policies only where a user needs to see their own rows. **Migration is handed to you as manual SQL — you run it [D12].**

Existing tables (`kalamai_analyses`, `kalamai_pages`, `kalamai_articles`, `kalamai_llm_calls`, `kalamai_events`, `kalamai_quotas`) are **extended**, not duplicated. New columns marked ➕.

### 2.1 Extensions to existing tables

**`kalamai_quotas`** ➕ `monthly_spend_inr_limit numeric not null default 0` **[C, Q11 correction]** — the primary cap, denominated in **rupees of LLM spend**, not analysis count. ➕ `analyses_daily_limit int not null default 0` kept as a coarse rate guard. Re-seed per tier (illustrative — **calibrated against real `kalamai_llm_calls` token logs, not my estimates**): guest ₹0, **free member ₹30/mo (≈ 1–2 analyses)**, premium ₹400/mo, founder ₹800/mo, admin −1 (unlimited). Daily guards: free 1/day, premium 15/day, founder 25/day.
Note **[D11]**: v1 gates on **quota only** — every member gets `rank` and `write`; tiers differ by *rupee volume*, not feature access. No feature-level capability checks on rank/write in v1. The free tier's small quota is deliberate: **quota exhaustion is the conversion trigger** (upgrade prompt speced in `write`, §3.3).

**`kalamai_pages`** — already has `body_text` (migration `_pages_body`). No change; chunking reads `body_text`.

**`kalamai_analyses.report`** (existing jsonb) gains a `clusters` key: `[{ id, centroid: float[768], competitor_count, label, exemplar_chunk_ids[], is_gap: bool }]`. 12-ish clusters × 768 floats fits one jsonb row; rescore loads one row, no join. (If profiling shows the jsonb is heavy, promote to a `kalamai_clusters` table in v2 — not now.)

### 2.2 New tables

**`kalamai_serp_cache`** — weekly SERP snapshot cache **[C, Q7 A]**
| col | type | notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| cache_key | text **unique not null** | `lower(keyword)‖'|'‖language‖'|'‖country‖'|'‖week_bucket` |
| keyword | text not null | |
| language | text not null | |
| country | text not null | |
| week_bucket | text not null | ISO year-week, e.g. `2026-W29` |
| serp | jsonb not null | `{organic[], paa[], ai_overview_urls[]}` |
| source | text not null default 'dataforseo' | |
| fetched_at | timestamptz default now() | |
Index: unique(cache_key) — the only lookup path, **bounded**. TTL = bucket rollover (a new week ⇒ new key ⇒ miss).

**`kalamai_global_budget`** — monthly global hard caps, fail-closed **[C, Q7 + Q11 correction]**
| col | type | notes |
|---|---|---|
| month_bucket | text pk | `2026-07` |
| serp_calls | int not null default 0 | incremented atomically per real SERP fetch |
| serp_cap | int not null | ₹2000 ÷ ₹0.25 = **8000** calls/mo |
| llm_spend_inr | numeric not null default 0 | incremented per LLM call from actual `cost_usd × ₹/$` |
| llm_cap_inr | numeric not null | global monthly LLM ceiling (fail-closed) |
Over either cap ⇒ **fail closed** (clear error, not a warning). SERP check inside the SERP-fetch path; LLM check inside every spending step.

**`kalamai_user_budget`** — per-user monthly LLM spend ledger, fail-closed **[C, Q11 correction]**
| col | type | notes |
|---|---|---|
| user_id | uuid not null | |
| month_bucket | text not null | |
| llm_spend_inr | numeric not null default 0 | incremented per LLM call from actual token cost |
| pk | (user_id, month_bucket) | |
Cap comes from `kalamai_quotas.monthly_spend_inr_limit` by role. Before any LLM-spending step (R4 brief; W1–W4 draft), an atomic RPC checks `user.llm_spend_inr + est_cost > role_cap` and `global.llm_spend_inr + est_cost > global_cap`; either true ⇒ **fail closed**. User-cap breach returns `quota_exceeded` → triggers the upgrade prompt (§3.3). Actual spend is written back after each call from `kalamai_llm_calls.cost_usd` (real tokens, day one), so the rupee-per-tier mapping calibrates against observed usage.

**`kalamai_corpus_pages`** — persistent background corpus, labeled **[D8]**
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| url | text **unique not null** | dedupe across seed keywords |
| language | text not null | |
| country | text not null | |
| keyword_seed | text not null | query it was crawled for |
| serp_rank | int | position in that seed's SERP |
| is_positive | boolean | **label**: rank ≤10 ⇒ true; rank 30–100 ⇒ false; null = adjacent non-ranker |
| ok | boolean not null default false | crawl/extract success |
| title, meta_description | text | |
| headings | jsonb | h1–h3 tree |
| body_text | text | boilerplate-stripped |
| word_count | int | |
| jsonld_types | text[] | |
| junk_ratio | numeric(4,3) | extraction QA metric (see §7 risk 2) |
| fetched_at | timestamptz default now() | |
Index: unique(url); (language, country); (is_positive). Training reads the whole corpus by language — **intentional full scan, offline only**.

**`kalamai_chunks`** — ~200-token chunks + embeddings **[C, Q4 model pinning]**
| col | type | notes |
|---|---|---|
| id | bigint identity pk | |
| source_type | text not null | `'corpus' | 'competitor' | 'draft'` |
| corpus_page_id | uuid → kalamai_corpus_pages on delete cascade | for corpus |
| analysis_id | uuid → kalamai_analyses on delete cascade | for competitor chunks |
| article_id | uuid → kalamai_articles on delete cascade | for draft chunks (ephemeral, replaced each rescore) |
| chunk_index | int not null | |
| text | text not null | |
| token_count | int not null | |
| embedding | **vector(768)** not null | text-embedding-004 = 768 dims |
| embedding_model | text **not null** | **[C]** e.g. `text-embedding-004`. Stored per row; changing the model invalidates vectors — this is a schema fact, not config. |
| created_at | timestamptz default now() | |
Indexes: **hnsw (embedding vector_cosine_ops)** for ANN; btree (analysis_id), (corpus_page_id), (article_id).
**Unbounded-query call-out**: any vector search MUST carry a `where` filter (analysis_id or language) **and** a `LIMIT`. An unfiltered ANN query scans the whole corpus. Rescore's semantic step compares draft chunks to the analysis's cluster centroids held in memory — it does **not** ANN-search the corpus at request time.

**`kalamai_term_signals`** — cached log-odds per analysis **[C, Q12]**
| col | type | notes |
|---|---|---|
| id | bigint identity pk | |
| analysis_id | uuid → kalamai_analyses on delete cascade not null | |
| term | text not null | |
| ngram | int not null | 1–3 |
| z | numeric | z_w (weighted log-odds z-score) |
| delta | numeric | δ_w (log-odds ratio) |
| doc_freq | int not null | competitors containing term |
| coverage | numeric not null | doc_freq / n_competitors |
| freq_lo | numeric | Q1 × L/1000 target-count low |
| freq_hi | numeric | Q3 × L/1000 target-count high |
| created_at | timestamptz default now() | |
Index: unique(analysis_id, term); (analysis_id). Written once at R3; **every rescore reads this instead of recomputing the corpus** — the mechanism that makes rescore cheap.

**`kalamai_rank_model`** — learned + hand-tuned coefficients + calibration **[C, Q9 both paths]**
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| version | int not null | |
| kind | text not null | `'learned' | 'hand_tuned'` |
| feature_names | text[] not null | ~25 |
| coefficients | numeric[] not null | aligned to feature_names |
| intercept | numeric not null | |
| platt_a, platt_b | numeric | calibration to 0–100 |
| auc | numeric | membership AUC |
| auc_no_wordcount | numeric | AUC with word count held out |
| wordcount_corr | numeric | score ↔ word-count correlation |
| trained_at | timestamptz | |
| active | boolean not null default false | one active per kind |
| notes | text | |
Index: (active). Selectable by config: `KALAMAI_RANK_MODEL_KIND = learned | hand_tuned`. Hand-tuned is the documented fallback if AUC is weak.

**`kalamai_score_snapshots`** — every score, both scorers, drift history **[C, Q12 + Q13]**
| col | type | notes |
|---|---|---|
| id | bigint identity pk | |
| article_id | uuid → kalamai_articles on delete cascade | |
| analysis_id | uuid → kalamai_analyses on delete set null | |
| user_id | uuid | |
| scorer | text not null | `'v1_checklist' | 'v2_rank'` |
| model_version | int | → rank_model.version, for v2 |
| overall | int not null | 0–100 |
| features | jsonb | the 25-feature vector (v2) |
| subscores | jsonb | term / semantic / entity / paa / length … |
| word_count | int | |
| at_publish | boolean not null default false | **[C, Q13]** score frozen at publish time |
| created_at | timestamptz default now() | |
Index: (article_id, created_at desc); (user_id, created_at desc); partial (article_id) where at_publish.
**Unbounded-query call-out**: drift queries (`"my score dropped"`) MUST bound by `article_id` and a time window + `LIMIT`. Never `select * from score_snapshots where user_id = …` unbounded.

### 2.3 RLS summary

- Service-role writes everywhere (matches existing pattern).
- Self-read: `kalamai_score_snapshots` (`auth.uid() = user_id`), plus existing self-reads on analyses/articles.
- `kalamai_corpus_pages`, `kalamai_chunks`, `kalamai_term_signals`, `kalamai_rank_model`, `kalamai_serp_cache`, `kalamai_global_budget`, `kalamai_user_budget` = service-role only, no client policy.

---

## 3. Data flow — the two primary journeys

### 3.1 Journey A — keyword → brief

```
POST /api/kalamai/analyses
  └─ RPC kalamai_check_and_consume  [extended: + daily cap, + RUPEE budget precheck]
       dedupe → concurrency → hourly → DAILY → user_llm_spend<cap → global_llm_spend<cap
       (either budget breach ⇒ fail closed; user breach ⇒ quota_exceeded → upgrade prompt) → insert (queued)
Poller → /api/kalamai/step  (one transition each)
  R1 search   : serp_cache lookup by (kw,lang,country,week)
                 HIT → reuse (₹0)   MISS → budget CAS (fail closed) → DataForSEO → cache insert
                 write serp_urls/paa/ai_overview → status=crawling
  R2 extract  : crawl BATCH=6 (existing) → Readability strip → upsert kalamai_pages(body_text)
                 chunk each page ~200 tok → Gemini embed batch → insert kalamai_chunks(competitor)
                 loop until crawl_cursor ≥ total → status=extracting
  R3 distill  : log-odds (Fightin' Words) vs background corpus  [Hinglish-normalized]
                 coverage gate ≥60% → target ranges Q1/Q3 per-1000w → write kalamai_term_signals
                 k-means over competitor chunks, silhouette pick k∈6..16 → centroids → report.clusters
                 entities + PAA → status=analyzing
  R4 craft    : budget gate (fail closed) → one Claude Sonnet call → brief → increment both ledgers → status=complete
```

Rank does **not** run in Journey A. The brief consumes distill output; scoring is Journey B.

**Draft model routing [Q11 correction]** (article machine, Journey not shown separately):
| pass | role | model |
|---|---|---|
| W1 outline | structure | **Sonnet 5** |
| W2 section drafts | bulk generation | **Haiku 4.5** |
| W3 critique / enrichment | judgement | **Sonnet 5** |
| W4 coherence edit | bulk rewrite | **Haiku 4.5** |
Every pass is preceded by the same fail-closed budget gate and followed by a real-cost ledger increment. No Opus.

### 3.2 Journey B — draft → score (rescore button) **[D14]**

```
User clicks "Rescore" in /tools/kalamai/w/[id]
POST /api/kalamai/score { articleId }   (synchronous, no state machine)
  1. load brief + kalamai_term_signals(analysis_id) + report.clusters   (all cached, no corpus recompute)
  2. term coverage : count normalized terms in draft → saturation curve → weight by z_w
  3. semantic      : chunk draft ~200 tok → Gemini embed → max cosine per centroid vs τ=0.72
                     + inverse: centroids no draft-chunk covers = differentiation surface
  4. features (25) : term/semantic/entity/paa coverage, length ratio, heading depth,
                     list/table presence, intent match, readability, …
  5. rank_model(active, kind per config) → logistic → Platt → 0–100        [v2_rank]
  6. ALSO run score.ts                                                     [v1_checklist, shadow]
  7. insert kalamai_score_snapshots ×2 ; log event 'rescore' (button-press instrumentation [D14])
  8. return { displayed: flag?v2:v1, v2, v1, delta, gaps[] }
```

Score-at-publish **[C, Q13]**: on export/publish, freeze the current score into `kalamai_score_snapshots(at_publish=true)`. Nothing consumes it in v1; it is the only future way to correlate our score against real GSC outcomes.

### 3.3 Quota exhaustion → upgrade prompt (conversion mechanic) **[C, Q11 correction]**

Quota is a conversion mechanic, so exhaustion is a designed moment, not a dead end. When `kalamai_check_and_consume` returns `quota_exceeded` (user rupee cap hit), the analysis/write UI renders an **upgrade prompt** in place of the error: shows spend used vs cap, what the paid tier unlocks (rupee headroom, daily limit), and a CTA to the existing membership/upgrade flow with `?plan=` resume (already in the codebase — see members-upgrade-modal). Global-cap breach shows a neutral "temporarily at capacity" message instead (not the user's fault, no upsell). Both are speced in the `write` module. Every exhaustion logs `kalamai_events('quota_hit')` for conversion-funnel analysis.

---

## 4. Caching strategy

| What | Table / store | Key | TTL / invalidation |
|---|---|---|---|
| SERP snapshot | `kalamai_serp_cache` | `(lower(keyword), language, country, ISO-week)` **[C]** | new week ⇒ new key ⇒ refetch. ~7× effective budget vs daily. |
| Background corpus pages | `kalamai_corpus_pages` | `url` unique | permanent; manual re-crawl only |
| Corpus/competitor embeddings | `kalamai_chunks` | row + `embedding_model` | permanent; **invalidated only by embedding-model change** (re-embed migration) |
| Per-query term signals | `kalamai_term_signals` | `analysis_id` | life of analysis; reused by every rescore (no corpus recompute) |
| Cluster centroids | `kalamai_analyses.report.clusters` | analysis row | life of analysis |
| Brief prompt context | Anthropic ephemeral cache | brief+params prefix | ~5 min (Anthropic side; existing) |
| Draft embeddings | `kalamai_chunks(source_type='draft')` | `article_id` | replaced each rescore (cheap) |

The two expensive things named in Phase 2 constraints — SERP and the corpus — are the two permanent caches. SERP is weekly-bucketed; the corpus is built once and never expires except on model change.

---

## 5. Cost model **[addresses the 7× watch directly]**

**Assumptions (labeled — correct me if any are off):** ₹/$ = 83 · DataForSEO organic live/advanced = **$0.003 = ₹0.25/call** · Gemini text-embedding-004 = **free tier** (rate-limited 1500 rpm, ₹0) · Claude Sonnet 5 = $3/$15 per MTok in/out · Claude Haiku 4.5 = **$1/$5 per MTok in/out** · 10 competitor pages/analysis · ~2,000 words/page ≈ 2,600 tokens ≈ 13 chunks ⇒ ~130 chunks/analysis. **These estimates are provisional — real per-generation token counts are logged to `kalamai_llm_calls` from day one and the rupee-per-tier quota is calibrated against them, not against this table [C].**

### 5.1 Two separate ledgers — the key point

The ₹2,000 cap and the weekly bucket govern the **SERP ledger**, which is a *small slice* of per-analysis cost. Per-analysis all-in cost is **dominated by the Claude brief**, not SERP. Pricing a fresh SERP call into every analysis would both overstate cost and hide that the cap is a SERP-only budget.

**Ledger 1 — DataForSEO budget (what the ₹2,000 cap governs):**
- ₹2,000 ÷ ₹0.25 = **8,000 SERP fetches/month**.
- Weekly bucket ⇒ one fetch per `(keyword, week)`, not per analysis. If a keyword is analyzed `R` times inside its week, effective analyses per fetch = `R`.
- At a conservative reuse `R = 3` → **~24,000 analyses/month** of SERP-side capacity from the same 8,000 fetches. Daily per-user cap stops one user draining it in an afternoon.
- **This is the 7× (weekly vs daily): the same rupees stretch across a week's worth of repeat lookups.**

**Ledger 2 — per-analysis all-in cost:**
| item | cost |
|---|---|
| SERP (cache MISS) | ₹0.25 |
| SERP (cache HIT, the common case) | ₹0 |
| Crawl (own bandwidth) | ₹0 |
| Embeddings (130 chunks ≈ 26k tok, free tier) | ₹0 |
| Distill (log-odds + k-means, pure compute) | ₹0 |
| Brief — Claude: (30,000×3 + 2,000×15)/1e6 = $0.12 | **₹10** |
| **Total (miss)** | **≈ ₹10.25** |
| **Total (hit)** | **≈ ₹10.00** |

So SERP is **~2.5%** of a cache-miss analysis and **0%** of a cache-hit one. The brief is 97%+. The weekly bucket's job is to protect the *SERP budget cap*, not to reduce per-analysis cost — those are different quantities, and the plan keeps them separate.

### 5.2 Per article generated (4-pass draft, with Haiku routing) **[Q11 correction]**
| pass | model | tokens (in/out) | cost |
|---|---|---|---|
| W1 outline (runJson) | Sonnet | 3k / 1k | (3k×3+1k×15)/1e6 = $0.024 |
| W2 section drafts (runText) | **Haiku** | 4k / 8k | (4k×1+8k×5)/1e6 = $0.044 |
| W3 critique/enrichment (runJson) | Sonnet | 6k / 1k | $0.033 |
| W4 coherence edit (skipped if critique.ok; ~50% run) | **Haiku** | 7k / 8k | $0.047 × 0.5 = $0.024 |
| **Total** | | | **≈ $0.125 ≈ ₹10.4/article** |

Routing Haiku onto the two bulk-token passes (W2 draft, W4 rewrite) **roughly halves per-article cost** (₹21 → ₹10.4) — the outline and critique passes, where model judgement matters, stay on Sonnet. With zero per-article revenue, this halving is the difference the budget has to absorb.

### 5.3 Per 1,000 rescores
- API cost: embeddings only, **free tier ⇒ ₹0 marginal**. The real limit is **Gemini rate (1,500 rpm)**, not rupees. 1,000 rescores × ~13 draft chunks = ~13k embed calls; batch + throttle keeps under the minute cap.
- If embeddings ever move to paid: 1,000 × 2,600 tok = 2.6M tok — still sub-₹1 at current text-embedding-004 pricing. **Rescore is compute/rate-bound, not cost-bound.** This is what makes the on-demand button safe to expose to all members.

---

## 6. Build sequence

Dependency order. **[G]** = gated (must show output before proceeding).

| # | Module | Depends on | Independently shippable? |
|---|---|---|---|
| 0 | **Schema migration** (pgvector + 8 new tables incl. global/user budget + rupee quota columns) | — | Unblocks all; ships nothing alone |
| 1 | **search + cache + budget spine** (serp_cache weekly; global+user rupee ledgers fail-closed; daily guard; rupee quota RPC) | 0 | **Yes — ship first**, cuts spend immediately, no algo dependency |
| 2 | **extract upgrade** (Readability boilerplate + ~200-tok chunking + Gemini embed in R2) | 0 | Yes |
| 3 | **corpus-crawl script** — **500 kw** first **[G, D8]** | 2 | Offline; **gate: report crawl success rate + sample extracted text before scaling to 2000** |
| 4 | **distill v2** (Hinglish normalization → log-odds → ≥60% gate → target ranges → k-means+silhouette) | 2, 3 | Ships behind flag |
| 5 | **semantic coverage** (draft-vs-centroid cosine, gap surface) | 2, 4 | Part of rank |
| 6 | **rank v2** (25 features → logistic **and** hand-tuned → Platt → validation harness) **[G]** | 3, 4, 5 | **Gate: show AUC, held-out-wordcount AUC, wordcount corr, adversarial suite before flipping display flag** |
| 7 | **write** (rescore button, score_snapshots, score-at-publish, button instrumentation) | 6 | Yes, once rank passes |
| 8 | **craft** rewire to richer distill (minor) | 4 | Yes |

Two things ship on Day 1 independent of the whole ML build: **search+cache** (pure spend reduction) and **extract upgrade**. Everything rank-ward waits on the corpus.

---

## 7. Risk register (top 5, ranked)

**1. The learned model measures length, not membership.** The single most likely failure — content explains a minority of ranking variance, and word count correlates with everything. If AUC collapses when word count is held out, we built a length detector.
→ *Mitigation:* validation harness trains a **word-count-held-out variant** and compares AUC; report the delta plainly; **do not flip the display flag if it collapses**; hand-tuned fallback **[D9]** exists so "weak AUC" never means "no score."

**2. Boilerplate stripper leaves nav/footer junk**, poisoning both log-odds counts and embeddings — garbage in, confident garbage out.
→ *Mitigation:* Readability (jsdom/linkedom) over the current regex; `junk_ratio` QA metric per corpus page; **500-kw gate [D8]** — inspect a sample of extracted text and the crawl success rate *before* spending on 2,000. Find junk after ~₹120, not after an overnight run.

**3. Budget blown with no revenue to absorb it** — and LLM spend, not SERP, is the real exposure (₹10/analysis brief + ₹10/article vs ₹0.25 SERP). Zero per-article revenue means an overrun is pure loss.
→ *Mitigation:* **rupee-denominated, fail-closed** caps at **both** global and per-user level **[C, Q11]** (`kalamai_global_budget` + `kalamai_user_budget`), checked before every spending step; Haiku routing halves per-article cost; small free-tier quota; weekly SERP bucket + per-user daily guard; cache-first everywhere; real-token logging from day one so the caps calibrate against observed spend, not guesses.

**4. Hinglish spelling variance defeats the 60% coverage gate.** `nahi/nahin/nhi` split three ways, each below 60%, so a valid term is silently dropped.
→ *Mitigation:* normalization pass **[C, D6]** — edit-distance merge of candidates above a similarity threshold + hand-maintained variant map for the top ~300 Hinglish tokens, applied **before** counting. Speced explicitly, tested on a Hinglish sample; not a TODO.

**5. Embedding model drift / rate limit invalidates stored vectors.** A model deprecation or a silent dimension change orphans the entire corpus.
→ *Mitigation:* `embedding_model` pinned on every chunk row **[C, Q4]**; corpus script throttles to the 1,500-rpm free-tier limit with backoff; a documented re-embed migration path (new model ⇒ new column value ⇒ rebuild ANN index).

*Runner-up (watch, not top-5):* the 60s serverless ceiling during embed — mitigated by embedding only the 6-page batch per step (§1.2).

---

## 8. Open decisions deferred to SPEC (not blocking approval)

- Exact 25-feature list and their extraction (rank spec).
- Prior mass α₀ starting value (spec says 500; will confirm against 500-kw corpus).
- Readability library choice: `@mozilla/readability`+`jsdom` vs `linkedom` (lighter, serverless-friendlier) — decided in extract spec.
- Silhouette distance metric (cosine) and k-means init (k-means++) — clustering spec.
- Daily/monthly quota numbers per tier — quota spec, tunable in `kalamai_quotas`.

---

## 9. Secrets / key timeline

Keys go into Vercel **when a module needs them at runtime** — not a build blocker. Everything is buildable and testable before then via the existing fake modes:
- `GEMINI_API_KEY` — embeddings. Needed only when running real corpus embed / live rescore. Fake: deterministic hash-stub vectors behind `KALAMAI_FAKE_EMBED=1`.
- `DATAFORSEO_LOGIN/PASSWORD` — SERP. Fake: `KALAMAI_FAKE_SERP=1` (exists).
- `ANTHROPIC_API_KEY` — brief + draft. Fake: `KALAMAI_FAKE_LLM=1` (exists).

Embedding model pinned: **`text-embedding-004`, 768-dim**, stored per chunk row **[C, Q4]**. Semantic subtopic coverage is **in `rank` v1**.

---

**End of PLAN.**
