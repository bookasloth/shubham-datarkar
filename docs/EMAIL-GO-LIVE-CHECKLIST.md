# Email System — Go-Live Checklist

Everything needed to take the branded email system (SP1–SP4) live. Branch `feat/emails-wiring` → **PR #199**.

## 0. Status at a glance
- 34 branded templates, GIF under the CTA, all 34 GIFs uploaded ✓
- Event emails wired (contact, OTP, newsletter, gift, membership webhook, requests, community)
- Auth emails wired (welcome, forgot-password, password-changed) — no Supabase dashboard hook needed
- Daily dispatcher (24h introduction, Diwali 2026-11-08, renewal, we-miss-you, inactive, weekly new-blogs, monthly roundup)
- Nothing sends in production until the steps below are done. All sends are fail-safe (no SMTP / no table → silent no-op).

---

## 1. Merge the PR
Review + merge **PR #199** (`feat/emails-wiring` → `main`).

## 2. Run ONE database migration (required for the dispatcher)
Supabase → SQL Editor → run this. **Without it, the scheduled emails send nothing** (the dedupe claim fails closed).

```sql
create table if not exists public.email_log (
  id           bigint generated always as identity primary key,
  recipient    text not null,
  template_key text not null,
  period       text not null,
  created_at   timestamptz not null default now(),
  unique (recipient, template_key, period)
);
create index if not exists email_log_template_period_idx
  on public.email_log (template_key, period);
alter table public.email_log enable row level security;
-- No policies on purpose — service-role (cron) only.
```
(Same file lives at `supabase/migrations/20260715000010_email_log.sql`.)

## 3. Environment variables (Vercel — all likely already set)
| Var | Purpose | New? |
|-----|---------|------|
| `SMTP_HOST/USER/PASS/...` (or the `/admin/integrations` DB creds) | sending | already set |
| `CRON_SECRET` | guards both cron routes | already set |
| `RAZORPAY_WEBHOOK_SECRET` | membership activated/renewed/failed emails | already set |

**No new secrets.** SP3 auth emails use `admin.generateLink` — no Supabase Send Email Hook, no dashboard config.

## 4. Deploy
Deploy `main` to Vercel. `vercel.json` now registers **two** daily crons (birthday + dispatcher) — Vercel picks them up automatically.

---

## 5. Post-deploy verification (do these live)

**Auth (highest priority — the reset flow changed):**
1. **Forgot password** end-to-end: request reset → receive branded email → click → lands on `/auth/confirm` → `/reset-password` → set new password → sign in. This swapped from PKCE to token_hash — confirm it works.
2. **Sign up** a test account → branded welcome arrives → ~24h later the introduction email arrives (cron).
3. **Change password** while signed in → "New password. Same you." arrives.

**Events:**
4. Contact form → visitor gets "Yep. I got it."
5. Post a community reply on someone's post → they get "… had something to say."
6. Gift a membership (`/admin/members`) → recipient gets the gift email.
7. Razorpay test charge/renewal/failure → activated / renewed / payment-failed emails.
8. Submit + approve/decline a member request → received / approved / declined emails.

**Dispatcher (manual trigger to test without waiting for 3:30 UTC):**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://shubhamdatarkar.com/api/cron/email-dispatch
```
Returns `{ ok: true, ist: "...", ran: { introductions, diwali, renewals, weMissYou, inactive, newBlogs, monthlyRoundup } }`. Non-zero counts = sends happened; check inboxes.

## 6. Diwali
The Diwali greeting fires **automatically on 2026-11-08 (IST)** to active subscribers. No action needed. No other festival emails exist (by request).

---

## 7. Thresholds (change if you disagree — tell me)
| Email | Fires when | Default |
|-------|-----------|---------|
| Introduction | after signup | 24–48h |
| Renewal reminder | before `current_period_end` | ≤ 3 days |
| We-miss-you | since last sign-in | > 30 days (monthly) |
| Inactive account | created + never used/unconfirmed | > 7 days (once) |
| New blogs | weekly | Mondays |
| Monthly roundup | monthly | 1st |

## 8. Known caps / follow-ups
- Dispatcher scans up to **1000 users per run** (page 1). Add pagination when the base grows.
- Digest sends loop per-subscriber with no throttle — fine for a modest list; large lists may hit Hostinger SMTP limits (move to an ESP later).
- **Not built yet (templates ready, triggers pending):** weekly leaderboard, streak reminder, community digest, first-post nudge, monthly member digest, new-member-resource. Say the word to wire these.
- If you later want Supabase's own signup-**confirmation** email branded too (separate from the welcome), that's a small follow-up.

## 9. GIFs
All 34 live at `https://company-assets.bookasloth.in/images/sd/email/<name>.gif`. Nothing to do.
