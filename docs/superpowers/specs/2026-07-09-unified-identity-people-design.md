# Unified Identity + People — Design

**Date:** 2026-07-09
**Status:** Approved (design), ready for implementation plan

## Core principle

One human = one verified account = one profile. Contact submissions, newsletter
signups, games played, support donations, and membership are **actions** that
attach to a profile — never separate user types.

```
Anonymous visitor ──(contact / newsletter / support donation / browse, no account, frictionless)
        │
        ▼
Creates + verifies account ──► Free profile
        │                         ├─ contact history
        ▼                         ├─ newsletter status
Premium (same account,            ├─ game progress
higher plan; monthly/yearly       ├─ donation history
= billing cadence only)           ├─ bookmarks / free downloads
                                  ├─ comments / community
                                  ├─ membership record
                                  └─ future products
```

There is no "contactor", "subscriber", "gamer", or "member" user type. Those are
badges/behaviors on one identity.

## Current state (why this is mostly a linking + view problem)

Two storage models exist today, not five:

| Behavior          | Table                                        | Real account? | Verified email? |
| ----------------- | -------------------------------------------- | ------------- | --------------- |
| Contact           | `public.contacts` (name/email/message)       | no            | never           |
| Newsletter        | `public.subscribers` (email/status)          | no            | never           |
| Support donations | `public.supports` (email/amount/status)      | no            | never           |
| Games             | `auth.users` + `public.profiles`             | yes           | yes             |
| Membership        | `auth.users` + `public.memberships`          | yes           | yes             |

Games and membership are **already one identity** — both are `auth.users`, keyed
by the same `user_id`. A gamer who buys membership is the same row. That half is
done.

Contacts, subscribers, and support donations are **email rows in log tables**.
They do not require an account, password, or email verification. They are
behaviors outside the identity system until that email later becomes a verified
account. (`supports` is RLS-locked and service-role write; its `anonymous` flag
hides the name in *public* views only — the email is always stored, so linking
works even for anonymous donations.)

Tiers already exist in the capability system (`20260708000001_capabilities.sql`,
`20260707000001_members_platform.sql`): a `'free'` plan row (amount 0, active),
`premium-monthly` (₹99), `premium-yearly` (₹999). Both premium plans grant an
identical capability bundle — monthly/yearly are billing cadence, not different
tiers. **No tier or pricing change in this project.**

## Decisions

1. **Link by email, live.** `auth.users.email` already matches `contacts.email`,
   `subscribers.email`, and `supports.email`. Linking = a join on `lower(email)`.
   No merge table,
   no backfill, no trigger, no new foreign key. The People view and per-person
   timeline query every table by email at read time. Nothing to keep in sync.
   > `// ponytail: link by email-join; add a nullable user_id FK + backfill only
   > if an email change ever breaks a link (see Future work).`

2. **No verification at contact / newsletter / donation entry points.** These
   are the highest-converting funnels. Contact form stores the message
   immediately; newsletter stores the subscription immediately; a support
   donation stores the (paid) `supports` row immediately. No account, no confirm
   step. When that email later becomes a verified account, its history attaches
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
distinct `lower(email)` across `contacts ∪ subscribers ∪ supports ∪ auth.users`,
with search + pagination.

Returned shape (illustrative — exact SQL in the plan):

```
email, display_name, user_id, verified,
contacted, contact_count, subscribed,
donated, donation_total,
is_gamer, plan_key, membership_status,
first_seen, last_seen
```

Badge semantics (important — avoid false positives):

- **contacted** = has any `contacts` row for the email.
- **subscribed** = has an `active` `subscribers` row for the email.
- **donated** = has at least one `paid` `supports` row for the email;
  `donation_total` = sum of `total_amount` over paid rows. (`anonymous` affects
  public display only, not this admin aggregate.)
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
- support donations (`supports`) — amount, payment status, timestamp
- game results (`game_results` via the account) — game, status, timestamp
- membership (`memberships`) — plan, status, timestamp

Each row normalized to `{ kind, occurred_at, title, detail }`. Downloads,
bookmarks, purchases, and other activity sources join in later as the platform
grows (see Future work) — v1 covers the five behaviors above.

### 3. `/admin/people` page

New admin route. Badge table (Name/email · Contact · Newsletter · Donation ·
Games · Membership) with search + pagination, backed by `get_people()`. Clicking
a row opens the person's timeline (`get_person_timeline`).

Nav: add **People** to the `Audience` group in
`src/components/admin/layout/nav-config.tsx`. Keep the existing
`/admin/subscribers` and `/admin/contacts` pages as behavior-scoped drill-downs
(People is the unified top view, not a replacement for per-table management).

### 4. Free-account CTAs

On success, invite the email-only visitor to create a verified account:

- Contact form success → "Create your free account to track this" CTA.
  (`src/lib/contact/actions.ts` success path → contact form section UI.)
- Newsletter success → same CTA. (`src/components/sections/newsletter-form.tsx`.)
- Support page success → "Create your free account to keep track of your
  contributions" CTA. (Support success path → support section UI.)

Copy links to the members signup/login flow (`/members/login`). No auto-account,
no auto-subscribe — an explicit nudge only.

### 5. Free-tier surfaces

Free = verified account with no active premium membership. Free must be able to
log in and reach: dashboard, game progress, donation history, bookmarks, free
downloads, newsletter preferences, comments/community, member profile.

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
- **Anonymous donation** → the `supports.anonymous` flag only hides the name in
  public views; the email is still stored. So anonymous donations stay
  frictionless and attach to the person's profile automatically when an account
  is later created with the same email.
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

- `get_people()`: seed contacts+subscribers+supports+auth users with overlapping
  and distinct emails → assert one row per distinct email, correct badges,
  `donated` true only for `paid` supports with correct `donation_total`,
  `is_gamer` false when a profile exists but no `game_results`, admin gate
  rejects non-admin.
- `get_person_timeline()`: email with rows in all five sources → assert merged,
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
