# SPEC — `craft` (content brief + outline)

## Purpose
Turn distill's signals into a strategist-grade brief: outline (H2/H3), entities to cover, term clusters, PAA to answer, AEO/GEO insights, meta options, schema JSON-LD. Mostly **exists** ([brief.ts](../../../src/lib/kalamai/brief.ts) + R4); v2 change = feed it distill's richer, gated output instead of the old weighted-frequency terms.

## Inputs
- `kalamai_term_signals` (gated terms + z + target ranges), `report.clusters` (subtopic labels), entities, PAA, competitor heading trees, `targetLength`.

## Outputs
- `Brief { entities, termClusters, outline{h2,h3}, questions, aeoInsights, metaTitles, metaDescriptions, schemaType, schemaJsonLd }` (existing `BRIEF_SCHEMA`, unchanged shape).
- Written to `kalamai_analyses.report.brief`.

## Algorithm
1. Build prompt (`buildBriefPrompt`, existing) — swap term input: use distill's gated terms with `{term, z, coverage, freq_lo, freq_hi, ngram}` (top ~40 by z) + cluster labels as suggested subtopics + top-15 PAA + top-10 competitor heading trees. Corpus payload stays under the 30K-token budget.
2. One **Claude Sonnet 5** structured-output call (`runJson<Brief>`, effort low), **budget-gated** (fail closed) and cost-logged to `kalamai_llm_calls` (existing).
3. Enforce meta constraints in-prompt (title ≤60, desc ≤155).

## Deviation from existing
- Cluster labels from distill become explicit outline-subtopic hints (previously the LLM invented clusters unaided). Improves alignment between brief and what `rank` will score.

## External dependencies
- Anthropic (`claude-sonnet-5`). Fake: `FAKE_BRIEF`.

## Failure modes & fallback
| failure | behaviour |
|---|---|
| Budget cap | fail closed before the call; analysis `failed` w/ upgrade prompt |
| LLM parse failure | existing structured-output retry; hard-fail after → analysis `failed` |
| Empty distill signals | brief still generated from headings + PAA; flagged low-confidence |

## Acceptance criteria (testable)
1. Brief outline H2s reference ≥1 distill cluster label (assert overlap on a fixture).
2. Meta title ≤60 / desc ≤155 (existing constraint, assert).
3. Cost logged to `kalamai_llm_calls` with `stage='R4'`.
4. Fake mode returns `FAKE_BRIEF` with zero spend.
