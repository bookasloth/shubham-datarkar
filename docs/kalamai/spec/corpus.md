# SPEC — `corpus` (offline background corpus + model training)

Not one of the nine request modules, but `distill` (background priors) and `rank` (labels + trained model) depend on it. Built as a **standalone local Node script** [D3] — no Inngest, not deployed. Run by hand: 500 kw first, gate, then 2,000 [D8].

## Purpose
Build the persistent, labeled background corpus (a few thousand crawled pages per language/market), compute background term frequencies, and train + calibrate the `rank` logistic model. Cached forever; refreshed manually.

## Inputs
- A seed keyword list per `(language, country)` — 500 first, then 2,000.
- Env: `DATAFORSEO_*`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Outputs
- `kalamai_corpus_pages` (deduped by URL, labeled `is_positive`: rank≤10 → true, 30–100 → false, adjacent-query non-rankers → false).
- `kalamai_chunks(source_type='corpus')` with 768-dim embeddings + `embedding_model`.
- Background term-frequency table (per language) for distill's Dirichlet prior.
- `kalamai_rank_model` rows: `kind='learned'` (trained) and `kind='hand_tuned'` (documented fallback), with validation metrics.

## Algorithm
1. **Fetch SERPs** for seed keywords (reuse `search`, but bypass the per-user quota; still respect the global SERP budget). Depth 100 so we get positives (1–10) and negatives (30–100).
2. **Crawl + extract** every URL via `extract` (Readability + junk_ratio). Politeness/robots as normal.
3. **Label**: top-10 → positive; 30–100 → negative; pull a few adjacent-query pages as extra negatives.
4. **Chunk + embed** (Gemini, throttled to free-tier rpm w/ backoff).
5. **Background frequencies**: aggregate normalized (Hinglish-normalized) token counts across the whole corpus per language → the prior for distill's log-odds.
6. **Train** logistic regression on the 25 features (rank spec §C) with membership labels; standardize; **Platt-scale** on held-out folds. Store coefficients + params.
7. **Run the validation harness** (rank spec) on the corpus and write AUC / word-count corr / held-out-wordcount AUC / adversarial results onto the model row.

## Gate [D8] — MANDATORY before scaling 500 → 2,000
After the 500-kw run, **report and stop**:
- crawl success rate (% URLs `ok`),
- a **sample of extracted body text** (eyeball for nav/footer junk — risk 2),
- mean `junk_ratio`,
- term-list sanity (top gated terms for a few queries),
- model AUC + word-count leakage numbers.
Proceed to 2,000 only after these look clean. Find a broken stripper after ~₹120, not after an overnight run.

## No mock/synthetic validation [Hard Rule 3]
Training + validation use **real SERP/crawl data only**. If DataForSEO or crawl data is unavailable, the script **stops and says so** — it does not fabricate a corpus.

## External dependencies
- `search`, `extract` modules. DataForSEO, Gemini, Supabase service role.
- Logistic trainer: dependency-free TS gradient descent (25 features × ~10k rows is trivial) — no ML framework.

## Failure modes & fallback
| failure | behaviour |
|---|---|
| High crawl failure (>30%) | gate flags it; investigate stripper/robots before spending more |
| Embed rate-limit | backoff + resume (idempotent by URL/chunk); safe to re-run |
| Weak AUC | ship `hand_tuned` as active; report weakness plainly; do not flip display flag |
| Partial run interrupted | idempotent upserts (URL unique) → re-run continues |

## Acceptance criteria (testable)
1. 500-kw run reports crawl success rate + junk_ratio + a text sample + AUC before any 2,000 expansion.
2. `kalamai_corpus_pages` deduped by URL; labels present; no unlabeled positives.
3. Background frequency table covers ≥ the gated vocabulary distill needs (no empty-prior fallback after corpus exists).
4. Two model rows written (`learned`, `hand_tuned`) with full validation metrics.
5. Re-running the script does not duplicate pages/chunks (idempotent).
6. With no DataForSEO creds → script exits with a clear "no real data" message, writes nothing.
