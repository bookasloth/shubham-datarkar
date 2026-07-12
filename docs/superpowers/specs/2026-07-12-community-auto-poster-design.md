# Community Auto-Poster — Design

**Date:** 2026-07-12
**Status:** Approved (design), pending spec review
**Feature:** Automatically post updates to the `/community` feed when things happen elsewhere on the site.

---

## 1. Goal

Keep the `/community` feed alive without manual posting. When a meaningful event happens elsewhere (content published, PR shipped, a new supporter, a growth milestone), insert a community post authored by the owner account — worded from a rotating pool of templates so it reads human, not robotic.

All posts publish **instantly** (no review queue — owner's decision). Everything is **zero-cron**; the one time-based source (daily game winner) was cut.

## 2. Sources (5)

| # | Source | Trigger point | Post | Identity |
|---|--------|---------------|------|----------|
| 1 | Blog / case study / build-in-public update **published** | existing publish server actions (`blog/actions.ts`, `content/actions.ts`, `support/updates` `insertUpdate`) | text + link to the thing | owner |
| 2 | **Community size** crosses 10/25/50/100/250/500/1000 | Postgres `AFTER INSERT` trigger on `profiles` (signup is a DB trigger — no app hook exists) | text | owner |
| 3 | **Supporter count** crosses 10/25/50/100 | support confirm route (app), after a real paid transition | text + `/support` link | owner |
| 4 | **New supporter** (any paid support) | support confirm route, same once-per-transition gate as existing `postThankyou` | text, **anonymous** + `/support` link | owner |
| 5 | **PR merged** on GitHub | **new** webhook route `/api/community/github` | humanized PR title | owner |

Non-goals (YAGNI, add later if wanted): YouTube/Spotify polling, daily-winner cron, "total games played" milestone, LLM-written copy, review queue, opt-in supporter naming.

## 3. Architecture — one engine, thin triggers

Every source reduces to the same shape: *event → insert one `community_posts` row authored by the owner, worded from a template pool, exactly once*. So the build is one small engine plus five thin call sites.

### 3.1 `autoPost` helper — `src/lib/community/auto/post.ts`

```
autoPost({ kind, sourceKey, body }): Promise<void>
```

- Resolves the **owner profile id** once (see 3.3) — `community_posts.user_id` is a NOT NULL FK to `profiles(id)`, so an auto-post needs a real profile.
- Inserts `{ user_id: owner, type: 'text', body, auto_key: sourceKey }` via `supabaseAdmin()` (service role — auto-posts aren't tied to a signed-in session).
- **Idempotent**: `auto_key` is a nullable `UNIQUE` column; insert with `ON CONFLICT (auto_key) DO NOTHING`. Manual posts leave it null (Postgres allows many nulls under a unique index).
- `revalidatePath('/community')`.
- **Best-effort**: wrapped in try/catch that only logs — an auto-post failure must never break the host action (publishing a blog post, confirming a payment). Mirrors the existing `postThankyou` guard.

### 3.2 Template pools — `src/lib/community/auto/templates.ts`

Mirrors the proven `thankyou-messages.ts` structure (arrays of preset strings, random pick via `node:crypto` `randomInt`).

- **≥10 templates per kind** (the "doesn't feel like a bot" requirement).
- Kinds: `blog`, `caseStudy`, `update`, `supporter`, `supporterMilestone`, `memberMilestone`, `pr`.
- `pick(kind, vars)` → random template with `{title}` / `{url}` / `{n}` placeholders filled.
- Pure (only `node:crypto`) so it's unit-testable directly, like the existing message modules.

### 3.3 Owner identity — `src/lib/community/auto/owner.ts`

- `getOwnerProfileId()` resolves the owner's `profiles.id` from `ADMIN_EMAIL` (`select p.id from profiles p join auth.users u on u.id = p.id where lower(u.email) = lower($ADMIN_EMAIL)`), via `supabaseAdmin()`.
- Cached per server process (the owner id never changes at runtime).
- The owner already renders with the gold founder badge (`is_founder`, `community_badge()`), so no badge work is needed.

### 3.4 Idempotency keys (`auto_key` values)

`blog:<postId>` · `case:<studyId>` · `update:<updateId>` · `pr:<number>` · `supporter:<supportId>` · `member-milestone:<n>` · `supporter-milestone:<n>`

## 4. Per-source detail

### 4.1 On-publish content (blog / case study / update)
- Hook the existing publish server actions. Fire `autoPost` **only when the row is published AND live** (not a draft or a future-scheduled post) — reuse the exact condition `notifyIfLive` already uses in `blog/actions.ts` (`status === 'published' && published_at && published_at <= now`).
- `sourceKey = blog:<id>` etc. so re-saving a published post (which re-runs the action) never double-posts.
- Body: template + canonical URL to the published item.

### 4.2 Community-size milestone
- **Postgres `AFTER INSERT` trigger on `profiles`**, because signup creates the profile via the `handle_new_user` DB trigger — there is no server action to hook.
- The trigger function counts `profiles`, and when the count exactly equals a threshold in `{10,25,50,100,250,500,1000}`, inserts a `community_posts` row authored by the owner (owner id resolved in SQL the same way as 3.3), body picked from a **SQL array of ≥10 templates**, `auto_key = 'member-milestone:<n>'`.
- Exact-match on the threshold fires once (`ON CONFLICT (auto_key) DO NOTHING` is belt-and-suspenders). Signups are one-at-a-time so a count can't leap past a threshold.
- **Tradeoff (ponytail):** these templates live in SQL, duplicated from the TS philosophy of pooled copy. Accepted because it keeps the source fully self-contained and cron-free. If SQL-side copy becomes a maintenance annoyance, the fallback is to redefine "member" as "someone who has posted" and fire from the community `createPost` server action instead (keeps all templates in TS, but changes the metric's meaning).

### 4.3 Supporter-count milestone
- In the support **confirm route**, after `markSupportStatus` reports a real `updated` transition to paid, count `supports` where `status='paid'`. If the count hits a threshold in `{10,25,50,100,250}`, `autoPost({ kind: 'supporterMilestone', sourceKey: 'supporter-milestone:<n>', ... })` with a `/support` CTA in the body.

### 4.4 New-supporter shout-out
- Same confirm-route gate as the existing `postThankyou` (fires exactly once per pending→paid transition).
- **Always anonymous** — never renders the supporter's name (owner's privacy decision; there's no review gate to catch a mistake). Body: template like *"Someone just supported the work 🙏 — you can too:"* + `/support` link.
- `sourceKey = supporter:<supportId>`.
- The existing `postThankyou` → `/support/updates` post is left untouched; this adds a separate `/community` post. (Open nuance flagged in §6.)

### 4.5 GitHub PR merged
- **New route** `POST /api/community/github` — GitHub webhook, event `pull_request`, action `closed` with `merged == true`.
- **HMAC verify** the `X-Hub-Signature-256` header against a `GITHUB_WEBHOOK_SECRET` env before doing anything (untrusted external input — trust boundary).
- **User-facing filter (prefix heuristic):** parse the PR title as `type(scope): subject`.
  - Announce when `type ∈ {feat, fix, perf, chore}`.
  - Skip when `scope ∈ {deps, ci, build, test, docs, refactor, style}` or `type ∉` the announce set.
  - **Kill switch:** a `no-announce` label on the PR force-suppresses regardless (cheap guard so a bad auto-tweet has an off-ramp).
- Body: `subject` with the conventional-commit prefix stripped and humanized (capitalized), wrapped in a `pr`-kind template (e.g. *"Just shipped: {subject}"*).
- `sourceKey = pr:<number>` — GitHub retries the webhook; idempotency prevents dupes.
- **Setup the owner must do:** add the webhook in the repo settings (payload URL + secret), set `GITHUB_WEBHOOK_SECRET` in the deployment env.

## 5. Data / infra changes

- **Migration** (own Supabase, manual SQL per project workflow):
  - `alter table community_posts add column if not exists auto_key text; create unique index if not exists community_posts_auto_key_key on community_posts(auto_key);`
  - `profiles` milestone trigger + function (§4.2).
- **New files:** `auto/post.ts`, `auto/templates.ts`, `auto/owner.ts`, `auto/templates.test.ts`, `app/api/community/github/route.ts`.
- **Edited files:** `blog/actions.ts`, `content/actions.ts`, `support/updates` insert path, `app/api/support/confirm/route.ts` (or `markSupportStatus` caller) — each gains ~1 `autoPost` call.
- **Env:** `GITHUB_WEBHOOK_SECRET` (and `ADMIN_EMAIL` already exists).

## 6. Open nuances (decide during implementation, not blockers)

1. **Supporter double-surface:** a paid support already posts to `/support/updates` (`postThankyou`) and will now also post to `/community`. Intentional (different audiences) — confirm the owner is fine with both, or gate one.
2. **Community-size templates in SQL** vs. redefining "member" to fire from an app action (§4.2 tradeoff).

## 7. Safety (baked in, since there's no review gate)

- Supporter names never public (anonymous by default).
- Idempotency on every source (`auto_key` unique) → no spam / no dupes from retries or re-saves.
- PR webhook HMAC-verified; `no-announce` kill switch.
- Auto-post is always best-effort/guarded — never breaks the host action (publish, payment).
- Posts authored by the owner account → feed voice stays first-person and owned.

## 8. Testing

- `templates.test.ts`: every kind has ≥10 templates; `pick` fills placeholders and returns a non-empty string; no unreplaced `{...}` remains.
- PR title parser: unit test the heuristic (announce/skip/kill-switch cases) as a pure function.
- Idempotency: inserting the same `auto_key` twice yields one row (integration check).
