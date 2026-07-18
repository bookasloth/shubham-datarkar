# SPEC — `distill` (term signals, entities, subtopic clusters, PAA)

## Purpose
From the crawled SERP corpus + the persistent background corpus, produce the signals `rank` and `craft` consume: statistically-important terms (weighted log-odds, coverage-gated, with target ranges), semantic subtopic clusters, entities, and PAA questions. This replaces the naive weighted-frequency `terms.ts` for the v2 path (both kept, see rank spec / D2).

## Inputs
- `pages: ExtractedPage[]` for the analysis (the per-query SERP corpus), only `ok && wordCount ≥ 250`.
- `kalamai_chunks` for `analysis_id` (competitor embeddings).
- Background corpus term frequencies for `language` (precomputed from `kalamai_corpus_pages`, cached).
- `targetLength L` (target article length; default = median competitor word count).
- `paa` (from search).

## Outputs
- `kalamai_term_signals` rows: `{term, ngram, z, delta, doc_freq, coverage, freq_lo, freq_hi}` — the surfaced, gated terms only.
- `report.clusters`: `[{id, centroid float[768], competitor_count, label, exemplar_chunk_ids[], is_gap}]`.
- Entities + PAA passed into the brief input (craft).

## Algorithm

### 1. Hinglish spelling-variant normalization [C, D6] — BEFORE any counting
- **Hand map** (`data/hinglish-variants.json`, ~300 top tokens): canonical ← {variants}. e.g. `nahi ← nahin,nhi,nai`; `hai ← hain,h,hai`; `kya ← kia,kyaa`.
- **Edit-distance merge** for candidates not in the map: within a query's candidate set, merge two candidates if Damerau-Levenshtein ≤1 AND they share the first 2 chars AND both are flagged Hinglish (present in a romanized-Hindi lexicon or non-English by the stopword/language check). Merge into the higher-frequency surface form.
- Applied to both SERP-corpus and background-corpus counting so the two sides are comparable.
- Rationale: without this, `nahi/nahin/nhi` split three ways, each below the 60% gate, silently dropping a valid term.

### 2. Candidate generation
- 1–3 grams over normalized body text, lemmatized (English: simple lemmatizer; Hinglish: no lemmatizer, normalization does the work).
- Stopword-filtered (existing English + Hinglish `STOP` set). Drop n-grams whose first or last token is a stopword.
- **N-gram double-count prevention**: if a 2/3-gram's count ≥ 0.8 × the count of a contained lower-gram, suppress the shorter gram (the phrase carries the signal). Deterministic, applied after counting.

### 3. Term importance — Weighted log-odds w/ informative Dirichlet prior ("Fightin' Words", Monroe et al.)
NOT TF-IDF. For each candidate `w`:
```
α_w = α₀ · (bg_freq_w / bg_total)          # informative prior from background corpus
δ_w = log( (y_serp + α_w) / (n_serp + α₀ − y_serp − α_w) )
    − log( (y_bg   + α_w) / (n_bg   + α₀ − y_bg   − α_w) )
var(δ_w) ≈ 1/(y_serp + α_w) + 1/(y_bg + α_w)
z_w = δ_w / sqrt(var(δ_w))
```
- `y_serp` = occurrences of `w` in SERP corpus; `n_serp` = total tokens SERP corpus. `y_bg, n_bg` = background.
- `α₀ = 500` start (tunable in SPEC after 500-kw corpus; stored in config).
- `z_w` is the ranking + weighting signal. Positive, high `z_w` = distinctively over-represented on this SERP vs the language baseline.

### 4. Coverage gate [C] — hard, non-negotiable
- `doc_freq` = # of **selected competitors** (top-10 organic, `ok && wordCount≥250`) whose body contains `w` (post-normalization).
- `coverage = doc_freq / n_competitors`.
- **Surface `w` only if `coverage ≥ 0.60`.** Below → dropped entirely, never written to `term_signals`. This is what keeps the list clean; it is a filter, not a weight.

### 5. Target ranges — median/IQR, never mean/stddev [C]
Among competitors that **contain** `w`, take per-1000-word frequency `f_i = 1000 · count_i / words_i`.
```
Q1 = 25th pct of {f_i},  Q3 = 75th pct
freq_lo = Q1 · L / 1000
freq_hi = Q3 · L / 1000
```
IQR, not mean±sd — one 6,000-word competitor must not blow out the range.

### 6. Semantic subtopic clusters [C, D5 — k-means + silhouette, NOT HDBSCAN]
- Input: competitor chunk embeddings (`kalamai_chunks` for analysis).
- **k-means (k-means++ init, cosine distance via L2-normalized vectors) for k = 6..16; pick k by highest mean silhouette score.** Deviation from spec's HDBSCAN justified: no HDBSCAN in JS; silhouette-selected k adapts cluster count to query type (commercial ~15 subtopics, definitional ~5) — fixed k over/under-splits. ~30 extra lines, negligible compute on a small matrix.
- Each cluster = a subtopic. `competitor_count` = # distinct competitors with ≥1 chunk in the cluster. Weight clusters by `competitor_count`.
- `label` = nearest chunk's leading sentence (cheap human label). `centroid` = mean of member vectors (stored for rescore).
- **Gap surface**: also emit clusters where `competitor_count` is high but included as `is_gap=false`; the inverse (subtopics the SERP covers that a given draft misses) is computed at rescore time, not here. Here we only mark `is_gap=false` for all; the differentiation surface is a rescore output against the draft.

### 7. Entities & PAA
- Entities: capitalized noun-phrase + JSON-LD `@type`/`name` harvest across competitors, coverage-gated ≥40% (looser than terms). Passed to craft.
- PAA: passthrough from search, deduped, top-15.

### 8. Confidence
- If `n_competitors < MIN_CONFIDENT (20 crawled ok, or <5 top-10 ok)` → set `kalamai_analyses.low_confidence=true`. Signals persist but rank downweights (see rank spec).

## External dependencies
- Background corpus term-frequency table (from corpus script). Until it exists, distill runs with an **empty/uniform prior** (`α_w = α₀/V`) and logs `no_background_corpus` — log-odds degrades toward raw over-representation but still functions. This is the one place distill depends on module `corpus`.
- k-means: pure TS (no lib) or a tiny dependency-free implementation.

## Failure modes & fallback
| failure | behaviour |
|---|---|
| No background corpus yet | uniform prior, flagged; still produces gated terms |
| < 3 competitors with body | skip clustering (`report.clusters=[]`), terms still computed, `low_confidence=true` |
| All chunks unembedded (embed outage) | `report.clusters=[]`; rank semantic feature = 0 with a `semantic_unavailable` flag (not a silent zero) |
| Empty candidate set after gate | `term_signals` empty; rank term-coverage feature = neutral prior, flagged |

## Acceptance criteria (testable)
1. On a fixture SERP where a term appears in 5/10 competitors → **not** surfaced (coverage 0.5 < 0.6); a term in 7/10 → surfaced.
2. Log-odds: a term over-represented vs background gets `z_w > 2`; a generic high-frequency stopword-adjacent term gets `z_w ≈ 0` (prior absorbs it). Assert on a crafted mini-corpus.
3. Target range from `{f_i}` uses Q1/Q3: inserting one extreme-frequency competitor shifts `freq_hi` by < 10% (IQR robustness) vs mean+sd which would move ≫.
4. Hinglish: corpus with `nahi/nahin/nhi` split 3/3/2 across 8 competitors → after normalization, `nahi` coverage = 8/8, surfaced (proves the gate isn't defeated by variance).
5. Clustering: a 2-topic synthetic embedding set → silhouette picks k≈2 region within 6..16 lower bound behavior documented; a diffuse set picks higher k. Assert chosen-k monotonicity on separable vs mixed fixtures.
6. N-gram dedup: "content marketing" present ~ as often as "marketing" → "marketing" suppressed.
