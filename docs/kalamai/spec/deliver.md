# SPEC — `deliver` (v1: export + score-at-publish)

## Purpose
Get the finished article out (Markdown / HTML) and **store the score at publish time** for future outcome-correlation. WordPress push + GSC loop are **v2** [D13].

## Inputs
- `articleId` (owned, `status='complete'`), `blocks`, `meta`, current v2 `score`.

## Outputs
- Markdown / HTML download (existing `serialize.ts` + export-buttons).
- `kalamai_score_snapshots(at_publish=true)` row [C, Q13].
- `kalamai_events('export')`.

## Algorithm
1. Export = existing `blocksToMarkdown` / `blocksToHtml`. Unsupported blocks drop to null (never crash) — unchanged.
2. On export click: freeze the current displayed score into a `at_publish=true` snapshot **before** serving the file. Non-negotiable even though nothing consumes it in v1 — it's the only future way to prove the score correlates with real outcomes, not just with the SERP snapshot it came from.
3. Log `export` event with format.

## Deferred to v2 (explicitly not built now)
- WordPress REST push.
- GSC feedback loop (pull impressions/clicks/position, correlate against stored `at_publish` scores).

## External dependencies
- None new. (`serialize.ts` exists.)

## Failure modes & fallback
| failure | behaviour |
|---|---|
| Snapshot write fails | still serve export; log error; retry snapshot best-effort (don't block the download) |
| No score yet (never rescored) | run one rescore inline, then freeze |

## Acceptance criteria (testable)
1. Export produces valid MD and HTML for a mixed-block fixture (existing tests).
2. Every export writes exactly one `at_publish=true` snapshot carrying the current score + word_count.
3. Exporting an article never rescored triggers one rescore first, then the snapshot.
4. `export` event logged with format.
