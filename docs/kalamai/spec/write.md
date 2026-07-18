# SPEC — `write` (editor + on-demand rescore)

## Purpose
Show the generated article as editable blocks and let the user **rescore on demand** with the v2 `rank` score, see gaps, and (at export) freeze the score. On-demand button, not keystroke-live [D14]. Also the home of the quota-exhaustion upgrade prompt [Q11].

## Inputs
- `articleId` (owned), current `blocks` (edited), source `analysis` (brief, term_signals, clusters).

## Outputs
- Rendered editor (`/tools/kalamai/w/[id]`, exists) + a **Rescore** button.
- On rescore: `{ displayed, v2, v1, delta, gaps{missingTerms, uncoveredClusters} }`.
- `kalamai_score_snapshots` rows (both scorers) per rescore; `at_publish=true` snapshot at export.

## Algorithm
1. **Rescore route** `POST /api/kalamai/score { articleId }` (new, synchronous, Node runtime, maxDuration 60):
   - ownership check (403/404); load brief + `term_signals` + `report.clusters` (cached — **no corpus recompute**).
   - run `rank` v2 (embeds current draft, term/semantic/feature/logistic/Platt) + `v1_checklist` in shadow.
   - **budget note**: rescore embeds draft only (Gemini, ~₹0.03); no Claude call → no LLM-budget gate needed, but still rate-limit embeds. Count rescores via `kalamai_events('rescore')` [D14 instrumentation].
   - write both snapshots; return.
2. **UI**: debounce the button (ignore re-clicks within 1.5s); show score, delta vs last, and gap chips (missing terms with target range, uncovered subtopic clusters). Editing blocks does not auto-score.
3. **Score-at-publish** [C, Q13]: on export/publish action, freeze current v2 score into `kalamai_score_snapshots(at_publish=true)`.
4. **Quota-exhaustion upgrade prompt** [C, Q11]: any create/gen returning `quota_exceeded` renders the upgrade component (spend used vs cap, paid-tier headroom, CTA → existing `?plan=` upgrade flow). Global-cap breach → neutral "at capacity" message, no upsell. Log `quota_hit`.

## Deviation / scope
- No keystroke-live rescore in v1 (semantic needs a server round-trip; "live" would mislead). v2 decision driven by instrumented button-press frequency.

## External dependencies
- Gemini embeddings (draft). `rank`. Existing membership upgrade flow.

## Failure modes & fallback
| failure | behaviour |
|---|---|
| Embed outage | rank returns with neutral semantic + flag; UI shows "semantic unavailable, term-only score" |
| Rescore spam | debounce + rate-limit; excess → 429 |
| Score route error | keep last score; toast "rescore failed", no snapshot written |

## Acceptance criteria (testable)
1. Clicking Rescore writes exactly two snapshots (`v1_checklist`, `v2_rank`) and logs one `rescore` event.
2. Editing blocks without clicking Rescore writes **no** snapshot (on-demand only).
3. Export writes one `at_publish=true` snapshot with the displayed score.
4. `quota_exceeded` renders the upgrade prompt (not a raw error); global cap renders the neutral message.
5. Double-click within 1.5s → one rescore, not two.
