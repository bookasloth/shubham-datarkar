# SPEC — `extract` (crawl, boilerplate strip, chunk, embed)

## Purpose
Turn competitor URLs into clean, boilerplate-free body text + structured headings, then chunk and embed that text for semantic clustering. Same job for the offline corpus crawl. One dead competitor must never block the analysis.

## Inputs
- Per analysis: `serp organic URLs` (from `search`), `analysis_id`.
- Offline: a URL + `keyword_seed` + `serp_rank` (from the corpus script).
- Crawl politeness config: UA `KalamAIBot/1.0`, 10s timeout, `MAX_REDIRECTS=4`, robots respected.

## Outputs
- `ExtractedPage { title, metaDescription, headings{h1[],h2[],h3[]}, bodyText, wordCount, jsonldTypes[], junkRatio }`.
- Persisted to `kalamai_pages` (analysis) or `kalamai_corpus_pages` (offline), incl. `body_text`.
- `kalamai_chunks` rows: `{source_type, (analysis_id|corpus_page_id), chunk_index, text, token_count, embedding vector(768), embedding_model}`.

## Algorithm

### Crawl (reuse existing `crawl.ts`, unchanged)
SSRF-guarded (`isBlockedHost` every redirect hop), robots-checked, non-HTML rejected, returns `null` on any failure. No change.

### Boilerplate strip — UPGRADE from naive regex
Replace `extract.ts`'s first-`<article>/<main>/<body>` regex with a **Readability extraction**:
- Library: **`@mozilla/readability` + `linkedom`** (linkedom over jsdom — lighter, serverless-friendly, no native deps). Rung check: Readability is the stdlib-of-record for this exact job; do not hand-roll.
- Flow: `linkedom.parseHTML(html)` → `new Readability(doc).parse()` → `.textContent` for body, `.title` for title.
- Headings: extract `h1/h2/h3` from the Readability article DOM (its `content`), not the raw page (raw includes nav headings).
- Meta description + JSON-LD types: keep the existing `parseHtml` head parse (Readability drops head).
- **`junkRatio`** QA metric = fraction of extracted body lines matching a nav/boilerplate pattern (`^(home|menu|subscribe|©|cookie|share|follow us)` etc.). Stored per page; used by the corpus-build gate (risk 2) to catch a stripper leaving junk.
- Fallback: if `Readability.parse()` returns null (framework-rendered shell, no article) → fall back to the existing regex strip, set `extractMethod='regex_fallback'`, log it. Never throw.

### Chunk
- Target **~200 tokens/chunk**, split on sentence/paragraph boundaries (greedy pack sentences until ≥180 tokens, hard-cap 256). Token count via a cheap heuristic (`chars/4`) — exact tokenizer not needed for chunking.
- Drop chunks < 30 tokens (nav scraps, list stubs).
- `chunk_index` sequential per page.

### Embed
- **Gemini `text-embedding-004`, 768-dim**, `task_type=RETRIEVAL_DOCUMENT` for corpus/competitor chunks.
- Batch: embed a page's chunks in one API call where the SDK allows; throttle to free-tier rate (≤1500 rpm) with backoff.
- Store `embedding_model='text-embedding-004'` on **every** row [C, Q4].
- **Serverless placement**: competitor embedding runs inside the R2 `crawling` step, embedding only that step's `BATCH=6` pages — stays under the 60s ceiling. Offline corpus embedding runs in the local script, no ceiling.
- Fake: `KALAMAI_FAKE_EMBED=1` → deterministic vector = normalized hash of chunk text (stable, lets clustering tests run without a key).

## External dependencies
- `@mozilla/readability`, `linkedom` (new deps — both pure-JS, MIT, no native build).
- Gemini embeddings API (`GEMINI_API_KEY`).

## Failure modes & fallback
| failure | behaviour |
|---|---|
| Crawl fails (timeout/blocked/non-HTML/robots) | `kalamai_pages` row `ok=false`, no chunks; analysis continues |
| Readability returns null | regex-fallback strip, flagged; continues |
| Embedding API error | retry w/ backoff ×3; then page stored `ok=true` but **unembedded** (chunks with null embedding are excluded from clustering); log `embed_failed` |
| Whole page JS-shell, no text | `word_count` low → excluded from term/coverage counting by min-length filter |

## Acceptance criteria (testable)
1. On a fixture HTML with nav + footer + article, Readability output contains the article body and **excludes** nav/footer text (assert known nav string absent, known body string present).
2. `junkRatio` on a clean article < 0.05; on a nav-heavy page > 0.3 (sanity thresholds).
3. A ~2,000-word page yields ~10–14 chunks, each 30–256 tokens, `chunk_index` contiguous.
4. Every chunk row has a 768-length embedding and `embedding_model='text-embedding-004'`.
5. One URL that 500s does not throw and does not stop the other pages (assert other pages' rows present, failed row `ok=false`).
6. Fake-embed mode produces identical vectors for identical text across runs (determinism).
