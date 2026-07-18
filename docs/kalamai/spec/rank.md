# SPEC — `rank` (the scoring algorithm: 0–100 + learned model + calibration)

This is the core of the product. It implements the Phase-2 spec exactly; every deviation is justified in writing. Two scorers coexist (`v1_checklist` = existing `score.ts`, `v2_rank` = this); both run against the same validation harness, and the old path is deleted only after v2 wins on AUC [D2].

---

## Purpose
Predict whether a page **belongs to a SERP's top set** — not its rank position — from on-page content signals, and express it as a stable 0–100 score comparable across keywords. Surface the term/subtopic gaps that would raise it.

## Target definition [C — verbatim]
The score predicts **MEMBERSHIP in the top set**, not position. Content explains a minority of ranking variance; off-page dominates. Framing this as position-regression measures nothing.
- **Positives** = top-10 pages.
- **Negatives** = positions 30–100 **plus** topically-adjacent non-rankers (pages from related queries that don't rank for this one).
- Labels come from the corpus (`kalamai_corpus_pages.is_positive`) and, at inference, the live SERP.

## Inputs
- Draft: article text / `ContentBlock[]`, `word_count`, headings, lists/tables, meta.
- `kalamai_term_signals(analysis_id)` (cached log-odds, gated terms, target ranges).
- `report.clusters` (subtopic centroids + weights).
- Brief entities + PAA (craft output).
- `kalamai_rank_model` active row (learned or hand-tuned per `KALAMAI_RANK_MODEL_KIND`).
- SERP median word count.

## Outputs
- `overall: int` 0–100 (Platt-calibrated membership probability × 100).
- `subscores{ termCoverage, semanticCoverage, entityCoverage, paaCoverage, lengthRatio, structure, readability }`.
- `features` (the ~25-dim vector, logged to `kalamai_score_snapshots`).
- `gaps{ missingTerms[], uncoveredClusters[] }` — the differentiation surface.

---

## Algorithm

### A. Term coverage — saturation curve [C — verbatim]
For each gated term `w` with target range `[lo, hi]` (from distill) and draft count `x`:
```
x = 0        → credit = 0
0 < x < lo   → credit = (x / lo) ^ 0.6
lo ≤ x ≤ hi  → credit = 1.0
x > hi       → credit = max(0.5, 1 − 0.4·((x − hi)/hi)²)
```
The **0.6 exponent is deliberate — breadth beats repetition**: covering many terms shallowly scores higher than stuffing few. Per-term credit weighted by **normalized `z_w`** (min-max over surfaced terms, so importance drives contribution):
```
termCoverage = Σ_w ( norm_z(w) · credit(w) ) / Σ_w norm_z(w)
```

### B. Semantic subtopic coverage [C — the differentiator]
- Chunk the draft (~200 tok, same as extract), embed (Gemini `gemini-embedding-001`, `task_type=RETRIEVAL_QUERY`).
- For each cluster `c` (centroid + `competitor_count` weight): `sim(c) = max over draft chunks of cosine(chunk, centroid_c)`. Covered iff `sim(c) ≥ τ`, **τ = 0.72 start** (tuned on corpus).
```
semanticCoverage = Σ_c ( w_c · 1[sim(c) ≥ τ] ) / Σ_c w_c      where w_c = competitor_count
```
- **Inverse (differentiation surface)**: `uncoveredClusters` = clusters with high `w_c` that no draft chunk covers → exposed to the user as "subtopics competitors rank on that you're missing", and separately the clusters **no competitor** covers well (from distill) as opportunity.
- If clustering unavailable (`semantic_unavailable`) → feature set to a neutral 0.5 with a flag; **never a silent 0** (a silent 0 would tank every score during an embed outage).

### C. The ~25 features (feed the learned model)
| # | feature | source |
|---|---|---|
| 1 | termCoverage (A) | distill + draft |
| 2 | semanticCoverage (B) | clusters + draft |
| 3 | entityCoverage | entities present / total gated |
| 4 | paaCoverage | PAA questions answered (heading/text match) |
| 5 | lengthRatio | draft_words / SERP_median_words |
| 6 | lengthRatio² | captures "too short AND too long both bad" |
| 7 | headingDepth | mean heading nesting depth |
| 8 | headingCount / 1k words | structure density |
| 9 | hasTable (0/1) | structure |
| 10 | hasList (0/1) | structure |
| 11 | listItemsPer1k | structure |
| 12 | intentMatch | draft intent vs SERP intent (informational/commercial/…), cheap classifier |
| 13 | readability | Flesch-ish, script-aware (Hinglish skips syllable count) |
| 14 | fleschGrade | " |
| 15 | avgSentenceLen | readability proxy |
| 16 | termBreadth | # gated terms with credit>0 / total (breadth, distinct from #1's weighted sum) |
| 17 | termStuffPenalty | # terms with x>hi (over-optimization signal) |
| 18 | h1TermHit (0/1) | primary term in H1 |
| 19 | metaTermHit | primary term in meta title |
| 20 | earlyTermDensity | gated-term credit in first 150 words |
| 21 | questionCoverage | PAA + interrogative headings answered |
| 22 | jsonldPresent (0/1) | schema markup |
| 23 | uncoveredClusterFrac | 1 − semanticCoverage complement detail |
| 24 | distinctEntityCount | normalized |
| 25 | lowConfidenceFlag (0/1) | from distill; lets model discount thin SERPs |

All features standardized (z-score using training-set mean/std, stored with the model).

### D. Learned combination [C] — logistic regression, both paths [D9]
- **Primary: logistic regression** on the 25 features, target = membership (positive/negative). Interpretable coefficients beat marginal AUC. Trained offline (module `corpus`), coefficients + standardization params stored in `kalamai_rank_model(kind='learned')`.
- **Fallback: hand-tuned coefficients** (`kind='hand_tuned'`), documented, monotonic-sane (positive on coverage features, negative on stuffPenalty). Selectable by `KALAMAI_RANK_MODEL_KIND`. If learned AUC is weak, we fall back here — never to "no score".
- **Platt scaling** [C]: fit `P = sigmoid(a·f + b)` on held-out folds so the raw logit maps to a calibrated probability; `overall = round(100·P)`. Same score means the same thing across keywords. `a,b` stored on the model row.

### E. Inference path (rescore, synchronous)
1. Load model + term_signals + clusters (all cached).
2. Compute features A–C.
3. `logit = intercept + Σ coef·z(feature)`; `P = platt(logit)`; `overall = 100·P`.
4. Also run `v1_checklist` (`score.ts`) → write **both** snapshots [D2].
5. Return v2 + gaps; displayed score = flag-gated (`KALAMAI_RANK_V2_DISPLAY`), v2 shadow-logged until it wins.

---

## Validation harness [C] — built WITH the module, not after. This is a gate.
Runs against **real SERP/corpus data only** — no mock/synthetic substitution for validation [Hard Rule 3]. If real data is unavailable, the harness stops and says so.

1. **Leave-one-out membership scoring** of top-10 pages: score each top-10 page against a corpus built from the other 9 + negatives; report mean score of held-out positives vs negatives.
2. **AUC** on membership classification (positives vs negatives), 5-fold. **Report it. AUC < 0.70 = weak features — reported as weak, not hidden.**
3. **Word-count leakage test** [C — the critical one]:
   - Report `corr(score, word_count)` and `corr(score, membership)`. The **former MUST be lower**.
   - Train a variant with **word count (features 5,6) held out entirely**; report its AUC.
   - **If AUC collapses without word count → we built a length detector. State that directly. Do not flip the display flag.**
4. **Adversarial suite** [C] — score four crafted inputs, assert ordering:
   - (a) keyword-stuffed word salad,
   - (b) verbatim #1 page,
   - (c) genuinely good article missing 20% of terms,
   - (d) off-topic page of matched length.
   - **Required: (a) must NOT score above (b).** Stuffed-salad > real-#1 is a **critical defect** → block release.
   - Expected sane order: (b) ≥ (c) > (d) ≥ (a), with (a) low.

Harness output (AUC, both correlations, held-out-wordcount AUC, adversarial table) is stored on the `kalamai_rank_model` row and **shown to the user before the display flag is allowed to flip** [Phase 3 gate].

## External dependencies
- Gemini embeddings (draft chunks). `distill` (term signals, clusters). `corpus` (training labels + background freqs).
- A logistic-regression trainer (offline; tiny, pure-TS gradient descent or a small dep — decided in corpus spec).

## Failure modes & fallback
| failure | behaviour |
|---|---|
| No trained model | use `hand_tuned` model; flag |
| Embed outage at rescore | semantic feature neutral 0.5 + flag; score still returns |
| `low_confidence` SERP | `lowConfidenceFlag=1` lets model discount; UI shows "low-confidence SERP" |
| term_signals empty | termCoverage neutral prior + flag |
| Platt params missing | fall back to raw sigmoid(logit); log `uncalibrated` |

## Acceptance criteria (testable)
1. Saturation curve exact: unit-test `credit(x)` at `x∈{0, lo/2, lo, (lo+hi)/2, hi, 2·hi}` matches the formula; `x>hi` never drops below 0.5.
2. Breadth beats repetition: article covering 10 terms once each scores **higher** than one repeating 3 terms 10× each (0.6 exponent test).
3. AUC on real corpus **reported** (not asserted > threshold — reported, per Hard Rule 3 honesty).
4. `corr(score, word_count) < corr(score, membership)` on the real corpus, **reported**.
5. Held-out-wordcount AUC **reported**; if it collapses, the harness output says "length detector" in plain text.
6. Adversarial: **assert stuffed salad (a) does not outrank verbatim #1 (b)** — hard test, release-blocking.
7. Platt: calibrated scores on a held-out fold have mean predicted ≈ mean observed membership rate (calibration within ±5 pts).
8. Both scorers write a `kalamai_score_snapshots` row per rescore with distinct `scorer` values.
