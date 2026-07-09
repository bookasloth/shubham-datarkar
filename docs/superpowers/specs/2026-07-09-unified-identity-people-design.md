# Unified Identity + People — Design

**Date:** 2026-07-09
**Status:** Approved (design), ready for implementation plan

## Core principle

One human = one verified account = one profile. Contact submissions, newsletter
signups, games played, and membership are **actions** that attach to a profile —
never separate user types.

```
Anonymous visitor ──(contact / newsletter / browse, no account, frictionless)
        │
        ▼
Creates + verifies account  ──►  Free profile
        │                          ├─ contact history
        ▼                          ├─ newsletter status
Premium (same account,             ├─ game progress
higher plan; monthly/yearly        ├─ bookmarks / free downloads
= billing cadence only)            ├─ comments / community
                                   ├─ membership record
                                   └─ future products
```

There is no "contactor", "subscriber", "gamer", or "member" user type. Those are
badges/behaviors on one identity.

## Current state (why this is mostly a linking + view problem)

Two storage models exist today, not four:

| Behavior   | Table                                   | Real account? | Verified email? |
| ---------- | --------------------------------------- | ------------- | --------------- |
| Contact    | `public.contacts` (name/email/message)  | no            | never           |
| Newsletter | `public.subscribers` (email/status)     | no            | never           |
| Games      | `auth.users` + `public.profiles`        | yes           | yes             |
| Membership | `auth.users` + `public.memberships`     | yes           | yes             |

Games and membership are **already one identity** — both are `auth.users`, keyed
by the same `user_id`. A gamer who buys membership is the same row. That half is
done.

Contacts and subscribers are **email rows in log tables** — no password, no
login, never verify. They are the only two behaviors outside the identity system.

Tiers already exist in the capability system (`20260708000001_capabilities.sql`,
`20260707000001_members_platform.sql`): a `'free'` plan row (amount 0, active),
`premium-monthly` (₹99), `premium-yearly` (₹999). Both premium plans grant an
identical capability bundle — monthly/yearly are billing cadence, not different
tiers. **No tier or pricing change in this project.**

## Decisions

1. **Link by email, live.** `auth.users.email` already matches `contacts.email`
   and `subscribers.email`. Linking = a join on `lower(email)`. No merge table,
   no backfill, no trigger, no new foreign key. The People view and per-person
   timeline query every table by email at read time. Nothing to keep in sync.
   > `// ponytail: link by email-join; add a nullable user_id FK + backfill only
   > if an email change ever breaks a link (see Future work).`

2. **No verification at contact/newsletter entry points.** These are the
   highest-converting funnels. Contact form stores the message immediately;
   newsletter stores the subscription immediately. No account, no confirm step.
   When that email later becomes a verified account, its history attaches
   automatically via the email join.

3. **Verification IS required at account creation.** A profile = a verified
   email. This includes games signup. Supabase Auth "Confirm email" must be
   **ON**. This reverses the games rollout's planned Confirm-email OFF — game
   signup now includes an email-confirm step. Accepted.

4. **Tiers unchanged.** Visitor (anon) → Free (verified) → Premium
   (monthly/yearly). No capability, plan, or Razorpay changes here.

## Components

### 1. `get_people()` — admin RPC

Security-definer, admin-gated (raises for non-admin). Returns one row per
distinct `lower(email)` across `contacts ∪ subscribers ∪ auth.users`, with
supports search + pagination.

Returned shape (illustrative — exact SQL in the plan):

```
email, display_name, user_id, verified,
contacted, contact_count, subscribed,
is_gamer, plan_key, membership_status,
first_seen, last_seen
```

Badge semantics (important — avoid false positives):

- **contacted** = has any `contacts` row for the email.
- **subscribed** = has an `active` `subscribers` row for the email.
- **is_gamer** = has at least one `game_results` row (NOT merely "has a
  `profiles` row" — `handle_new_user` creates a profile for *every* signup, so a
  profile alone does not mean they played).
- **plan** = active `memberships.plan_key` if an active membership exists, else
  `'free'` for a verified account, else none (email-only, no account yet).
- **verified** = `auth.users.email_confirmed_at is not null`.

Gate on `public.is_admin()`. `revoke execute` from `anon`; grant to
`authenticated` (the function itself enforces admin).

### 2. `get_person_timeline(p_email text)` — admin RPC

Security-definer, admin-gated. Chronological (desc) merge of everything one email
has done:

- contact messages (`contacts`) — timestamp, project_type, message
- newsletter events (`subscribers`) — subscribed/unsubscribed + timestamp
- game results (`game_results` via the account) — game, status, timestamp
- membership (`memberships`) — plan, status, timestamp

Each row normalized to `{ kind, occurred_at, title, detail }`. Downloads,
bookmarks, purchases, and activity join in later as those event sources mature
(see Future work) — v1 covers the four behaviors above.

### 3. `/admin/people` page

New admin route. Badge table (Name/email · Contact · Newsletter · Games ·
Membership) with search + pagination, backed by `get_people()`. Clicking a row
opens the person's timeline (`get_person_timeline`).

Nav: add **People** to the `Audience` group in
`src/components/admin/layout/nav-config.tsx`. Keep the existing
`/admin/subscribers` and `/admin/contacts` pages as behavior-scoped drill-downs
(People is the unified top view, not a replacement for per-table management).

### 4. Free-account CTAs

On success, invite the email-only visitor to create a verified account:

- Contact form success → "Create your free account to track this" CTA.
  (`src/lib/contact/actions.ts` success path → contact form section UI.)
- Newsletter success → same CTA. (`src/components/sections/newsletter-form.tsx`.)

Copy links to the members signup/login flow (`/members/login`). No auto-account,
no auto-subscribe — an explicit nudge only.

### 5. Free-tier surfaces

Free = verified account with no active premium membership. Free must be able to
log in and reach: dashboard, game progress, bookmarks, free downloads, newsletter
preferences, comments/community, member profile.

Most already exist under `/members` (dashboard, bookmarks, downloads, account,
tools). This project's concrete work:

- **Verify the `/members` access guard admits free users.** If it currently
  requires an active paid membership, adjust it so a verified free account
  reaches the dashboard and free surfaces. (Premium content stays gated by the
  capability resolver — free plan grants no premium capabilities, which is
  correct.)
- **Newsletter preferences** in `/members/account` — a subscribe/unsubscribe
  toggle that writes `subscribers.status` for the account's email. Small new
  surface.

Comments UI and community are **future** (the `resource_comments` table exists
with no UI) — out of scope here beyond confirming the free tier is the gate when
they land.

### 6. Email verification (Supabase setting)

Manual: Supabase dashboard → Auth → enable **Confirm email**. Required for
decision 3. No code, but the signup UX (games + members) must handle the
"check your email to confirm" state.

## Data / schema

**No new tables, no new columns in v1.** Two security-definer, admin-gated RPCs
(`get_people`, `get_person_timeline`). The join on `lower(email)` is the entire
linking mechanism.

RLS: unchanged. Both RPCs run security-definer and enforce `is_admin()`
internally; execute revoked from `anon`.

## Edge cases

- **Different email at contact vs signup** → not linked (email is the only
  signal). Acceptable; document it. A future admin "merge" action could handle it.
- **Case / whitespace** → all joins use `lower(trim(email))`. `subscribers`
  already has a `lower(email)` unique index; `contacts` does not dedupe — People
  aggregates by `lower(email)` so multiple contact rows collapse to one person
  with `contact_count`.
- **Unverified account** → with Confirm-email ON, an unconfirmed signup has
  `email_confirmed_at is null`; show as `verified=false`. It is still one person.
- **Unsubscribed** → `subscribed=false` but the person and their history remain.
- **Email-only person (no account)** → appears in People with `user_id=null`,
  `verified=false`, plan none. Valid — a lead, not yet a profile.

## Out of scope / future work

- Denormalized `user_id` FK on `contacts`/`subscribers` + confirm-time backfill —
  add only if email-change breaks live linking at scale.
- Timeline sources: downloads (`resource_events`), bookmarks, purchases
  (`payments`), generic activity — fold into `get_person_timeline` as needed.
- Admin manual "merge two emails into one person" action.
- Comments/community UI (free-tier gated when built).
- Auto-subscribe-on-signup opt-in (deliberately excluded — signup ≠ subscribe).

## Testing

- `get_people()`: seed contacts+subscribers+auth users with overlapping and
  distinct emails → assert one row per distinct email, correct badges,
  `is_gamer` false when a profile exists but no `game_results`, admin gate
  rejects non-admin.
- `get_person_timeline()`: email with rows in all four sources → assert merged,
  descending, correctly typed; admin gate.
- `/admin/people`: renders badges, search filters, row click loads timeline.
- Free access guard: a verified free account reaches `/members` dashboard;
  premium content still blocked.
- Newsletter preferences toggle writes `subscribers.status`.

## Manual steps (deploy)

1. Apply the RPC migration (write file, hand SQL to run manually per project
   workflow).
2. Supabase dashboard → Auth → **Confirm email ON**.
3. Vercel deploy (explicit, gated — no auto-deploy).
