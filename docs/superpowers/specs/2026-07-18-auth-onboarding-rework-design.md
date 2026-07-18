# Auth & Onboarding Rework — Design

Date: 2026-07-18
Status: Approved for planning

## Goal

Rework signup/login into separate pages with a self-owned email-verification
model: unverified users get a real session and may use the app for 48 hours,
after which they are blocked until they verify. New accounts pass through a
`/welcome` onboarding (username + referral source + membership upsell).

## Prerequisite (manual, blocking)

**Supabase Auth → "Confirm email" enforcement must be OFF.**

With it ON, `signInWithPassword` returns "Email not confirmed" and no session
can ever exist for an unverified user — which makes "skip and roam 48h"
(requirement 4) impossible. We stop relying on Supabase's gate and own the gate
ourselves via: our branded confirm email (already built), the login gate
(Phase 3), and the 48h cron ban (Phase 3).

Tradeoff accepted by owner: an unverified account holds a real session for up to
48h. Mitigation is the login gate + cron ban below.

## Current state (as-built)

- One `/login` page. `LoginForm` toggles signin/signup/magic in client state.
- Signup fields: Name (optional), Email, Password, **Confirm password**.
- Signup (`signUp` action → `createAccount`) uses `admin.generateLink` to create
  the user and mint a **branded** confirm link, sends it, and redirects to
  `/login?check=1` (a banner, not a dedicated screen). **No session is created.**
- Branded confirm link → `/auth/confirm` → `verifyOtp` → welcome email →
  redirect to `next` or `loginDestination` (admin→`/admin`, else `/members`).
- `/members/login` and `/games/login` already redirect to `/login?next=...`.
- `redirect.ts`: `safeNext` whitelists `/admin /members /games /community
  /tools/kalamai`; `loginDestination` falls back to identity default.
- `mail-providers.ts` already provides "open your email app" provider links.
- Cron pattern exists: `/api/cron/<name>/route.ts` guarded by
  `Authorization: Bearer ${CRON_SECRET}`, calling a service-role RPC, listed in
  `vercel.json` `crons`. Examples: `birthday-greetings`, `email-dispatch`.
- `profiles` table has `username`, `display_name` (identity, unique username).

## Requirements → phase mapping

| # | Requirement | Phase |
|---|-------------|-------|
| 1 | Separate login and signup pages | 1 |
| 2 | Register asks Name, Email, Password — one time (no confirm field) | 1 |
| 3 | Post-register "open your email app to verify" screen | 2 |
| 4 | Skip link under it → take them inside (unverified session) | 2 |
| 5 | Unverified 48h → block account | 3 |
| 6 | Unverified login → "verify your email before you login" | 3 |
| 7 | Login from game/community/membership → return to that home | 1 (mostly done) |
| 8 | Confirm → `/welcome` onboarding (username + referral, then membership) | 4 |

## Phase 1 — Separate pages + simplified register

- New route `/register` — sign-up only. Fields **Name, Email, Password**. No
  confirm-password field. Cross-link to `/login`.
- `/login` becomes sign-in only: keep magic-link and forgot-password. Remove the
  signup view from `LoginForm` (or split `LoginForm` into `SignInForm` /
  `RegisterForm`; signup view's cross-link points to `/register`).
- `signUp` action: drop the `confirm`/`password2` requirement. `createAccount`
  keeps min-length validation; the `confirm` mismatch check becomes dead for the
  page path (still used by the community modal until Phase 2 trims it).
- Requirement 7: `/members/login` + `/games/login` already forward `?next=`.
  Verify community and membership "sign in" entry points also pass
  `?next=/community` / `?next=/membership`. Add `/membership` to `NEXT_ALLOWED`
  if the membership home is a valid post-login destination. (`/membership` is
  currently public; confirm whether "membership home" means `/membership` or
  `/members`. Default: `/members` is the members home; `/membership` is the
  marketing/pricing page. Onboarding step 2 lands on `/members`.)
- Community join modal: drop its confirm-password field to match requirement 2.

**Risk:** low. No DB, no session-model change.

## Phase 2 — Unverified session + check-email screen (req 3, 4)

- Register action, after `createAccount` succeeds (account created + branded
  confirm email sent), calls `supabase.auth.signInWithPassword({ email,
  password })` on the SSR client to set session cookies. Works only because the
  prerequisite (Confirm email OFF) holds. On the unlikely sign-in error, fall
  back to today's `/login?check=1` behavior.
- Redirect to new **`/verify-email`** screen (server component). It shows:
  - Headline: check your inbox to verify `you@example.com`.
  - "Open your email app" buttons built from `mail-providers.ts` for the address.
  - A **"Skip for now →"** link → `loginDestination(next, email)` (their intended
    destination, or `/members`).
- The community join modal keeps its own "check your email" in-place ending
  (it deliberately does not create a session — unchanged).

**Risk:** medium — depends on the prerequisite toggle. If Confirm email is still
ON in the environment, sign-in fails and users land on the fallback banner
(degrades safely, no crash).

## Phase 3 — Login gate + 48h block (req 5, 6)

**Login gate (`signIn` action):**
After a successful `signInWithPassword`, read the user. If
`email_confirmed_at` is null:
- account age < 48h → allow (roam); proceed to `loginDestination`.
- account age ≥ 48h → `supabase.auth.signOut()`, return
  `{ error: "Verify your email before you log in." }` plus a resend affordance.

Account age from `user.created_at`. A banned account's `signInWithPassword`
returns an error before we can read the user; detect that error and show the
same "verify your email" + resend message (do not leak "banned").

**Resend:** a server action that re-mints the branded confirm link via
`admin.generateLink({ type: "signup", email })` for the existing unconfirmed
user and sends `confirmEmail`. Always reports success (no enumeration), mirroring
`requestPasswordReset`.

**48h cron ban:**
- New `/api/cron/block-unverified/route.ts`, mirroring `birthday-greetings`
  (CRON_SECRET bearer guard, service-role client).
- Service-role RPC `block_unverified_accounts()` sets `auth.users.banned_until`
  to a far-future timestamp where `email_confirmed_at is null and created_at <
  now() - interval '48 hours' and (banned_until is null or banned_until < now())`.
  Returns count. Idempotent.
- `vercel.json`: add `{ "path": "/api/cron/block-unverified", "schedule": "0 4 *
  * *" }`.

**Unban on verify:** `/auth/confirm`, after a successful signup-type `verifyOtp`,
clears `banned_until` for that user via the admin client, so resend→verify
restores access. (Also needed because a within-window verify of a
just-crossed-48h account should not stay banned.)

**Migration:** SQL for `block_unverified_accounts()` (security definer, service
role). Handed to owner to run per the manual Supabase workflow.

**Risk:** medium. Touches `auth.users` (bans). RPC must be service-role only.
Cron needs `CRON_SECRET` (already configured for existing crons).

## Phase 4 — `/welcome` onboarding (req 8)

- `/auth/confirm`: on signup-type verify, redirect to **`/welcome`** (carry the
  original `next` as `?next=` so onboarding can forward it after completion).
- New `profiles` columns: `onboarded_at timestamptz`, `referral_source text`.
- `/welcome` route gates: not signed in → `/login`; `onboarded_at` set → straight
  to `next`/`/members` (no re-onboarding).
- **Step 1** — username + "where did you hear about us":
  - Username input, uniqueness-checked. Set via a security-definer RPC
    (mirrors the account-edit RPC pattern) enforcing the existing 1:1
    email↔username rule and format constraints.
  - Referral source (select with an "Other" free-text, or plain text) → stored in
    `profiles.referral_source`.
  - Submit persists both; advances to step 2.
- **Step 2** — membership upsell:
  - Monthly/Yearly toggle + plan display.
  - **Buy** → existing membership checkout flow (Razorpay; reuse
    `/members/upgrade` / membership checkout — no new payment code).
  - **Skip** → set `onboarded_at`, go to membership home.
  - Completing checkout also sets `onboarded_at`.
- Either path → **membership home = `/members`** (or `next` if present and safe).

**Risk:** medium. New columns + username RPC (migration, owner-run). Reuses
existing checkout — no new payment surface.

## Migrations summary (owner-run SQL)

1. `profiles`: add `onboarded_at timestamptz`, `referral_source text`.
2. `set_username(p_username text)` security-definer RPC (if not already covered
   by an existing account RPC — verify during planning).
3. `block_unverified_accounts()` security-definer RPC.

## Open items to confirm during planning

- Exact "membership home" target: `/members` (assumed) vs `/membership`.
- Whether an existing RPC already sets username (reuse) or a new one is needed.
- Community/membership sign-in entry points already pass `?next=` (verify).
- Whether `/membership` should join `NEXT_ALLOWED`.

## Non-goals

- No new payment/checkout implementation (reuse existing).
- No change to magic-link or password-reset flows beyond page splitting.
- No change to admin routing.
