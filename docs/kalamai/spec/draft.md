# SPEC — `draft` (multi-pass AI article generation)

## Purpose
Generate a full article from the brief via a four-pass pipeline. Mostly **exists** ([writing-server.ts](../../../src/lib/kalamai/writing-server.ts)); v2 changes = model routing (Haiku on bulk passes) + fail-closed budget gate per pass.

## Inputs
- `articleId`, source `analysis.report.brief`, `params{targetWords, tone, audience, brandFacts?}`.

## Outputs
- `ContentBlock[]` (blocks), `meta{title,description,jsonld}`, `score` (from rank at W5), persisted to `kalamai_articles`.

## Algorithm — four passes (existing state machine), with model routing [Q11]
| pass | stage | model | call | budget-gated |
|---|---|---|---|---|
| W1 outline | `queued→outlining` | **Sonnet 5** | `runJson` OUTLINE_SCHEMA, effort low | yes |
| W2 section drafts | `outlining→drafting` | **Haiku 4.5** | `runText` streamed, cache-read brief prefix | yes |
| W3 critique/enrichment | `drafting→reviewing` | **Sonnet 5** | `runJson` CRITIQUE_SCHEMA | yes |
| W4 coherence edit | `reviewing→scoring` | **Haiku 4.5** | `runText`; **skipped if `critique.ok`** | yes |
| W5 score | `scoring→complete` | — | `rank.scoreArticle` (v2), pure code | no |
- Model selection: extend `llm.ts` `runJson`/`runText` to accept a `model` arg (default `claude-sonnet-5`); pass `claude-haiku-4-5` on W2/W4. **No Opus.**
- Prompt caching (existing): ephemeral `cache_control` on the shared brief+params prefix (`buildCachePrefix`). Cache reads on W2–W4 trim cost.
- Every pass: **budget gate** (`kalamai_user_budget` + `kalamai_global_budget`, fail closed) BEFORE the call; real token cost logged to `kalamai_llm_calls` and incremented into both ledgers AFTER.
- Single-flight `locked_at` CAS + `STEP_LOCK_MS` reclaim (existing). Failed row drops from quota (refund).
- Parse safety: `parseWithRepair` one repair re-call (existing).

## Deviation from existing
- Haiku routing on W2/W4 (was all-Sonnet) → per-article ₹21→₹10.4.
- W5 now calls **rank v2** (was v1 checklist). v1 still computed in shadow.

## External dependencies
- Anthropic (`claude-sonnet-5`, `claude-haiku-4-5`). Fakes: `FAKE_OUTLINE/DRAFT/CRITIQUE/REWRITE`.

## Failure modes & fallback
| failure | behaviour |
|---|---|
| Budget cap mid-pipeline | fail closed at next pass; article `failed`; partial refund; upgrade prompt |
| Unrepairable block output | `KalamaiHardFailure` → `failed` |
| Missing brief | `failed` `brief_missing` |
| Haiku quality regression | config switch to route the pass back to Sonnet (documented) |

## Acceptance criteria (testable)
1. W2 and W4 calls use `claude-haiku-4-5`; W1/W3 use `claude-sonnet-5` (assert model arg per stage).
2. `critique.ok=true` → W4 skipped (assert no W4 llm_call row).
3. Per-article total cost within ~±30% of ₹10.4 on a fixture run (real tokens logged).
4. Budget-exhausted user → article create returns `quota_exceeded`, no passes run.
5. Prompt-cache read tokens > 0 on W2 (cache hit on brief prefix).
