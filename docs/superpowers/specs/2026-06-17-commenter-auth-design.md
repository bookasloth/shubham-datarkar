# Commenter Authentication + Tier Badge (Sub-project 3 of 5)

**Date:** 2026-06-17
**Branch:** `feat/support-updates-core` (specced alongside #1; built after #1/#2)
**Status:** Approved design, pre-implementation

## Context

Part of the `/support/updates` social layer (see
`2026-06-17-support-updates-core-design.md`). Anyone — paid supporter or not — may
comment on an update post, but only after verifying ownership of an email address.
Verified commenters whose email matches a paid supporter show that supporter's tier
badge next to their name.

This spec is the **identity / authentication layer only**. The comment content,
threading, posting, and reply notifications are sub-project 4 and consume what this
builds. Reactions are sub-project 5.

## Goals

- Verify a commenter's email with a **6-digit OTP emailed over the existing SMTP**
  infra (`src/lib/email/`).
- After verification, persist a signed session so the commenter does not re-verify on
  every comment for ~30 days.
- Resolve a verified email to a supporter tier (Pillars / Guardians / Torchbearers)
  **server-side**, exposing only the tier — never the email — to the browser.
- Provide a reusable verify-gate UI primitive that sub-project 4's comment composer
  mounts.

## Non-goals

Comment storage, threading, posting, edit/delete, reply notifications (all #4).
Reactions (#5). Account/password login (this is lightweight email-ownership proof, not
auth accounts).

## Decisions (confirmed with owner)

- **Method:** 6-digit OTP, **in-page** entry (no magic link), sent via SMTP.
- **Tiers:** reuse the existing system in `src/lib/support/config.ts` /
  `src/lib/support/tiers.ts` — Torchbearers ≥₹100 (flame), Guardians ≥₹1000 (shield),
  Pillars ≥₹2500 (crown). No new gold/silver/bronze scheme. `tierFor(lifetime)` already
  maps a lifetime ₹ total to a tier; reuse verbatim.

## Tier matching (privacy-preserving)

Supporters are exposed only through email-free views. `support_lifetime.supporter_key`
is `encode(digest(lower(email), 'sha256'), 'hex')` and the view carries
`lifetime_amount` (sum of paid `total_amount`, grouped by `lower(email)`).

To badge a commenter:
1. Normalize the verified email: `lower(trim(email))`.
2. Hash it the same way: `sha256(normalizedEmail)` hex.
3. Query `support_lifetime` where `supporter_key = <hash>` → `lifetime_amount`.
4. `tierFor(lifetime_amount)` → tier or null.

No raw-email read, no service-role needed for the lookup; the anon-readable view
suffices, and the raw email never reaches the client.

## Data model

```
comment_verifications
  email       text primary key          -- lower(trim(email)); one active OTP per email
  code_hash   text not null              -- sha256(otp + server pepper), never the raw code
  expires_at  timestamptz not null       -- ~10 minutes from issue
  attempts    int  not null default 0    -- verify attempts, capped at 5
  last_sent_at timestamptz not null default now()  -- for send rate-limiting
  created_at  timestamptz not null default now()
```

- RLS enabled, **no anon/authenticated policy** — accessed only via the service-role
  client from server actions. The OTP hash is never exposed.
- Rows are transient: deleted on successful verify; stale rows expire and can be swept.
- Manual SQL migration `supabase/migrations/20260617000004_comment_verifications.sql`.

## Session token

On successful verify, set a signed cookie carrying the verified identity:

- Cookie `sd_commenter`, **httpOnly, secure, sameSite=lax**, ~30 day max-age.
- Payload `{ email, name, iat }`, HMAC-SHA256 signed with `COMMENTER_TOKEN_SECRET`
  (new env var). Tampering → signature mismatch → treated as unverified.
- The email lives only inside this server-read cookie; client components receive only
  `{ name, tier }` derived server-side.

## Modules

| Unit | Purpose | Depends on |
|------|---------|-----------|
| `lib/support/comment-auth.ts` | `requestOtp`, `verifyOtp`, `getVerifiedCommenter`, cookie sign/verify | service-role client, email sender |
| `lib/support/comment-tier.ts` | `resolveTier(email)` → tier \| null via the hash lookup | supabaseAnon, tiers.ts |
| `lib/email/` (existing) | sends the OTP email (new OTP template) | Vault `email_smtp` |
| `components/support/email-verify-gate.tsx` | name+email → send code → OTP input → verify; reports verified identity to parent | server actions |

### Server actions (`comment-auth.ts`)

- `requestOtp({ email, name })`: normalize; rate-limit (reject if `last_sent_at` within
  60s; cap ~5/hour per email); generate 6-digit code; upsert `{code_hash, expires_at
  (+10m), attempts:0, last_sent_at:now}`; email the code via SMTP. Returns `{ ok }` with
  no code leakage. No-op-safe if SMTP unconfigured (returns a clear error).
- `verifyOtp({ email, code })`: load row; reject if missing/expired or `attempts >= 5`;
  increment attempts; compare `sha256(code + pepper)`; on match delete row, set
  `sd_commenter` cookie, return `{ verified: true, name }`; else `{ verified: false }`.
- `getVerifiedCommenter()`: read+verify cookie → `{ email, name } | null` (server-only).

## UI — `EmailVerifyGate`

A self-contained client component (consumed by #4's composer):
1. If already verified (server passes initial state from `getVerifiedCommenter`), render
   nothing / a "commenting as {name}" line.
2. Else: name + email fields → "Send code" (calls `requestOtp`) → 6-digit OTP field →
   "Verify" (calls `verifyOtp`). On success, invokes an `onVerified` callback so the
   composer enables posting. Inline errors for rate-limit / wrong code / expired.

Monochrome, lucide icons, 8px spacing, existing form primitives — matches the project's
design system.

## Security

- OTP stored only as `sha256(code + server pepper)`; pepper from env
  (`COMMENTER_OTP_PEPPER`, or reuse `COMMENTER_TOKEN_SECRET`).
- Send rate-limit (per-email cooldown + hourly cap) and verify attempt cap (5) blunt
  brute force and mail-bombing.
- Cookie signed + httpOnly; email never sent to the client; tier computed server-side.
- Generic error messages — never reveal whether an email is a known supporter.

## Env (activation)

- `COMMENTER_TOKEN_SECRET` — HMAC secret for the session cookie.
- `COMMENTER_OTP_PEPPER` — pepper for OTP hashing (may equal the token secret).
- SMTP already configured via Vault `email_smtp`.

## Error handling

- SMTP unconfigured → `requestOtp` returns a clear "verification unavailable" error; the
  gate shows it; no crash.
- DB/view absent before activation → `resolveTier` fail-safes to `null` (no badge), feed
  still renders.
- Invalid/expired/over-limit OTP → inline field error, no leak.

## Testing / verification

- Unit: email normalization + hash equals the view recipe; OTP hash compare;
  cookie sign/verify round-trip; `tierFor` boundaries (₹99→null, ₹100→Torchbearers,
  ₹1000→Guardians, ₹2500→Pillars).
- `next build` / `tsc` / `eslint` clean.
- Manual (post-activation): request OTP → receive email → verify → cookie set →
  `getVerifiedCommenter` returns identity; supporter email shows correct badge,
  non-supporter shows none.
