# SPEC — `search` (SERP acquisition + caching)

## Purpose
Acquire the SERP for a `(keyword, language, country)` and hand downstream modules the organic URLs, PAA questions, and AI-overview citations. Protect the ₹2,000/mo DataForSEO budget with a weekly cache and a fail-closed cap.

## Inputs
- `keyword: string` (trimmed, non-empty, ≤200 chars)
- `language: string` (`en` | `hi-Latn` for Hinglish; ISO-ish, stored as-is)
- `country: string` (default `IN`)
- Derived: `week_bucket` = ISO year-week of "now" (e.g. `2026-W29`), UTC.

## Outputs
`SerpResult { organic: SerpOrganic[≤30], paa: string[], aiOverviewUrls: string[] }` — identical shape to the existing `serp/provider.ts` contract. Persisted to `kalamai_analyses.{serp_urls, paa, ai_overview_urls}` (unchanged) **and** cached in `kalamai_serp_cache`.

## Algorithm
1. Build `cache_key = lower(keyword)|language|country|week_bucket`.
2. **Cache lookup** `kalamai_serp_cache` by unique `cache_key`. HIT → return `serp` jsonb, cost ₹0, no external call.
3. MISS → **budget gate** (atomic RPC `kalamai_reserve_serp_call(month_bucket)`):
   - `select … for update` the `kalamai_global_budget` row; if `serp_calls + 1 > serp_cap` → **fail closed**, throw `KalamaiHardFailure("serp_budget_exhausted")` → analysis status `failed`, error surfaced.
   - else `serp_calls = serp_calls + 1`, commit.
4. Call `DataForSeoProvider.fetch()` (existing, 30s timeout, depth 30).
5. On success → `insert kalamai_serp_cache(cache_key, keyword, language, country, week_bucket, serp, source='dataforseo')` `on conflict (cache_key) do nothing` (idempotent under concurrent misses). Return.
6. On provider error/timeout → **do not** decrement the reserved call (the reservation is a spend guard, not a receipt); throw → analysis `failed`. Rationale: a decrement path invites double-spend races; a rare over-count of 1 is cheaper than the race.

## Provider mapping
- `language` → DataForSEO `language_code` (`en`, `hi`). Hinglish (`hi-Latn`) maps to `language_code=en` with `location_name=India` — DataForSEO has no romanized-Hindi locale; Latin-script queries resolve under English+India. Documented limitation.
- `country` → `LOCATION_BY_COUNTRY` (existing; extend beyond IN/US/GB as needed).

## External dependencies
- DataForSEO `serp/google/organic/live/advanced`. Basic auth `DATAFORSEO_LOGIN/PASSWORD`.
- Postgres advisory/row locks for the budget RPC.

## Failure modes & fallback
| failure | behaviour |
|---|---|
| Budget cap reached | Fail closed, `serp_budget_exhausted`, analysis `failed`, clear user message. No fetch. |
| Provider timeout/5xx | Analysis `failed` with `serp_fetch_failed`; reserved call stands (see step 6). |
| Provider returns 0 organic | Not an error — proceed with empty organic; `distill`/`rank` set `low_confidence`. |
| `KALAMAI_FAKE_SERP=1` | `FakeSerpProvider`, no budget touch, no cache write. |

## Acceptance criteria (testable)
1. Two analyses for the same `(keyword, language, country)` in the **same ISO week** → exactly **one** DataForSEO call; second is a cache HIT (assert `serp_calls` incremented once).
2. Crossing into a new ISO week with the same keyword → a second call (new `cache_key`).
3. With `serp_cap` set to current `serp_calls` → next MISS **fails closed**, no provider call issued (assert provider mock not invoked), analysis `failed`.
4. Concurrent duplicate misses → `on conflict do nothing` leaves exactly one cache row; no unique-violation throw.
5. Fake mode returns the fixture without incrementing budget or writing cache.
