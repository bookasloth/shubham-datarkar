# Security Audit & Penetration Test — shubhamdatarkar.com

**Date:** 2026-07-11
**Auditor role:** AppSec / DevSecOps / Ethical Pentest (static + config review)
**Branch:** `red-team-security-audit`
**Scope:** Full codebase — Next.js 16 (App Router) frontend + server actions + API routes, Supabase (Postgres + RLS + Storage + Auth), Razorpay payments, nodemailer email, Anthropic-backed KalamAI tool, admin panel.
**Method:** White-box source review of routes, server actions, RLS migrations, crypto, secret handling, and dependencies. Runtime/infra items that cannot be proven from source are called out explicitly.

> **Context:** This codebase already went through a hardening pass (PR #120, migration `20260713000001_security_hardening.sql`). The audit reflects that — the baseline is strong. Findings are mostly defense-in-depth and operational, not exploitable app-level holes.

---

## 1. Executive Summary

| | |
|---|---|
| **Overall security score** | **82 / 100** |
| **Risk rating** | **Low–Medium** |
| **Production readiness** | **Yes**, conditional. No Critical/High *application* vulnerability confirmed. Ship-blockers are none; the four Medium items (security headers, contact-form throttling, serverless rate-limit durability, dependency upgrades) should be closed on the launch checklist. |
| **Confirmed Critical** | 0 |
| **Confirmed High** | 0 (app) · 2 dependency CVEs (transitive/not-exploitable-as-used) |
| **Confirmed Medium** | 4 |
| **Confirmed Low / Info** | 5 |

**What's genuinely good** (verified in source, not assumed):

- **Auth gate fails closed.** `ADMIN_EMAIL` unset ⇒ nobody is admin (`src/lib/auth/session.ts:16`). Defense in depth: `proxy.ts` bounces unauthenticated `/admin`, and `src/app/admin/layout.tsx:5` re-checks `requireAdmin()` server-side on every admin page.
- **Payments are correctly verified.** HMAC signatures are checked with `timingSafeEqual` (`src/lib/razorpay/verify.ts`, `subscription-verify.ts`); amounts and subscription periods are recomputed server-side (client can't tamper price or interval); confirm is replay-idempotent; the webhook verifies the **raw** body.
- **No privilege escalation to paid tier.** `memberships` RLS exposes **only** SELECT (self + admin) — there is no INSERT/UPDATE policy, so authenticated users cannot self-write `status='active'`. Membership state changes only through the service-role path after signature verification (`activateMembership`, scoped to `user_id + subscription_id`) or the signed webhook.
- **Secrets never reach the client.** Service-role key, Razorpay secret, SMTP pass, commenter secrets, Anthropic key are referenced only in server modules; `src/lib/supabase/server.ts` imports `server-only`. Grep across every `"use client"` file: zero secret references.
- **XSS surface is tiny and handled.** The only `dangerouslySetInnerHTML` is JSON-LD (`src/components/seo/json-ld.tsx:24`), and its serializer escapes `<` → `<` (defeats `</script>` breakout; regression-tested). No user-supplied HTML/markdown is rendered raw.
- **Open-redirect boundary fails closed.** `safeNext()` allowlists own-app subtrees and rejects `//host` / `/\host` / absolute URLs (`src/lib/auth/redirect.ts`).
- **SSRF is guarded.** The KalamAI crawler checks `isBlockedHost()` on the initial URL, **every redirect hop**, and the robots.txt fetch (`src/lib/kalamai/crawl.ts`, `block-host.ts`).
- **Cost abuse is capped.** KalamAI paid LLM runs go through an atomic DB RPC (`kalamai_check_and_consume`) enforcing dedupe + concurrency + hourly + monthly quota, plus a single-flight `locked_at` claim.
- **JWTs are validated, not trusted.** Every auth path uses `supabase.auth.getUser()` (server-validated); no insecure `getSession()` anywhere.

---

## 2. Vulnerability Table

Severities are CVSS 3.1 base estimates. "Confirmed" = provable from source. "Review" = needs runtime/infra confirmation.

### M-1 · Missing HTTP security headers — **Medium** · CVSS ~5.3
- **OWASP:** A05 Security Misconfiguration · **CWE-693 / CWE-1021 (clickjacking)**
- **Where:** `next.config.ts` (no `headers()`), no `vercel.json`, `src/proxy.ts` (sets none).
- **Finding:** No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, or `Permissions-Policy` is emitted. Vercel adds HSTS on the custom domain automatically, but not these.
- **Impact:** No CSP fallback if an XSS sink is ever introduced; clickjacking possible (admin panel could be framed); MIME-sniffing; referrer leakage. Defense-in-depth gap, not directly exploitable today.
- **Fix:** Add a `headers()` block (patched code in §5). Verify with `curl -I https://shubhamdatarkar.com`.

### M-2 · Contact form has no rate limiting, captcha, or honeypot — **Medium** · CVSS ~5.3
- **OWASP:** API4 Unrestricted Resource Consumption · **CWE-799 / CWE-770**
- **Where:** `src/lib/contact/actions.ts:37` `submitContact()`
- **Finding:** Every other public write (`support/order`, `subscribers/actions`, `blog/reaction-actions`) calls `allow(...)`; the contact action does not. It inserts a `contacts` row **and** sends two emails per call — a notification to the inbox and an **auto-reply to the submitter-supplied address**.
- **Attack scenario:** Script POSTs the form in a loop → floods the `contacts` table and the admin inbox. Worse, setting `email` to a victim's address turns the site into an email-amplification relay ("Thanks — I got your message" sent to arbitrary victims from the site's SMTP identity), burning SMTP/domain reputation and risking blacklisting.
- **Impact:** Spam, storage growth, sender-reputation damage, mild reflected-email abuse.
- **Fix:** Wrap in `allow(\`contact:${clientIp(await headers())}\`, 3, 60_000)` + a hidden honeypot field; gate the auto-reply behind the same throttle (patched code in §5).

### M-3 · Rate limiter is in-memory & per-instance — **Medium** · CVSS ~5.0
- **OWASP:** API4 · **CWE-770**
- **Where:** `src/lib/rate-limit.ts`
- **Finding:** Counters live in a per-process `Map`. On Vercel serverless this resets on cold start and does **not** span concurrent instances — so `login`, `support-order`, `subscribe`, and `react` throttles are best-effort only. (The file's own comment acknowledges this.)
- **Impact:** Distributed or cold-start-timed abuse (credential-stuffing on login, order/subscribe flooding, reaction stuffing) bypasses the intended quota.
- **Fix:** Back `allow()` with Upstash Redis / Vercel KV (same `allow(key, limit, windowMs)` signature — drop-in). Keep the in-memory Map as an L1.

### D-1 · Vulnerable dependencies — **High (nominal) / effectively Low–Medium as used**
- **OWASP:** A06 Vulnerable & Outdated Components · **CWE-1035 / CWE-937**
- **`npm audit`:** 2 high, 2 moderate.

  | Package | Sev | Issue | Exploitable here? |
  |---|---|---|---|
  | `nodemailer` | High | `raw` message option bypasses `disableFileAccess`/`disableUrlAccess` → arbitrary file read + SSRF in delivered message | **No** — app uses structured `sendMail({to,subject,html,text})`, never `raw` (`src/lib/email/smtp.ts:37`). Upgrade = hygiene. |
  | `undici` | High | TLS-cert-validation bypass (SOCKS5), `Set-Cookie` header injection, WS DoS, cache poisoning | Transitive (fetch stack). No SOCKS5 proxy in use; still upgrade. |
  | `postcss` | Moderate | XSS via unescaped `</style>` in stringify | Build-time only. Low real risk. |
  | `next` | Moderate | via `postcss` | Patch with Next update. |

- **Fix:** `npm audit fix`, bump `nodemailer` to the patched line, update `next` to the latest 16.2.x patch, re-run audit. Verify: `npm audit` shows 0 high.

### L-1 · SSRF guard: no DNS resolution + integer/octal IP encodings — **Low** · CVSS ~3.5
- **OWASP:** A10 SSRF · **CWE-918**
- **Where:** `src/lib/kalamai/block-host.ts`
- **Finding:** The guard is a literal/name/dotted-decimal check with no DNS resolution. Bypasses: (a) DNS rebinding — a hostname that resolves to `169.254.169.254`; (b) non-dotted IP encodings the regex misses — `http://2130706433/` (=127.0.0.1), `http://0x7f000001/`, octal.
- **Why Low:** Crawl targets come from SERP organic results, **not** direct user input. Exploiting requires ranking an attacker-controlled hostname in Google for the user's keyword *and* pointing it at a private IP. The file documents this exact residual.
- **Fix (when it ever faces user-chosen hostnames):** resolve the host and block on the **resolved** IP; reject non-standard IP literal forms before the regex.

### L-2 · Community-media upload not path-scoped, no MIME restriction — **Low** · CVSS ~3.7
- **OWASP:** A01 / **CWE-434 (unrestricted upload)**
- **Where:** `supabase/migrations/20260710000004_community_media.sql:20` `community_media_member_write`
- **Finding:** The direct-upload RLS fallback checks `community_can_post()` but does **not** scope the object key to the uploader (no per-user folder) and imposes no content-type/extension limit. Bucket is `public: true`. A member could upload an SVG/HTML file, or collide on another user's intended key.
- **Why Low:** Primary upload path is the service-role server action (can validate); public files are served from `*.supabase.co` (a **different origin** from the app), so a malicious SVG can't reach app cookies. Member-gated, not anon.
- **Fix:** In the write policy, require the object path to start with `auth.uid()::text || '/'`; restrict to image MIME types; serve with `Content-Disposition: attachment` or an image-proxy. Same review for `support-media`.

### L-3 · Admin identity duplicated + case-sensitivity mismatch — **Low / Info**
- **CWE-710 (improper adherence to coding standards)**
- **Where:** DB `public.is_admin()` hardcodes `'bookasloth@gmail.com'` (`20260614000002_admin_auth.sql:11`); app reads `ADMIN_EMAIL`. `session.ts:24` compares email **case-sensitively**; `members/session.ts:44` compares **case-insensitively**.
- **Impact:** Two sources of truth for "who is admin" (drift risk on change). The case mismatch fails **safe** (would deny, not grant), so no escalation — but a mixed-case `ADMIN_EMAIL` could lock the admin out of `/admin` while still granting member-context admin. Consistency bug.
- **Fix:** Single source: have `is_admin()` read a config row/JWT claim, and lowercase-compare in both TS gates.

### L-4 · Contact email subject interpolates unsanitized name — **Low / Info** · CWE-93
- **Where:** `src/lib/contact/actions.ts:79` `subject: \`New contact: ${name}...\``
- **Finding:** User `name` (trimmed, sliced 120, but not CRLF-stripped) is placed in the Subject header. Header injection is prevented by nodemailer's MIME word-encoding, so this is defense-in-depth only.
- **Fix:** Strip `\r\n` from `name`/`projectType` before header use.

### L-5 · Items requiring runtime/infra verification — **Review**
Cannot be proven from source; confirm operationally (see §6):
- Prod env actually set: `ADMIN_EMAIL`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `COMMENTER_*`.
- All RLS migrations (esp. `20260713000001`) actually **applied** to the live project.
- Supabase Auth settings: email-confirmation on, leaked-password protection on, sane JWT/OTP expiry, minimum password length.
- Razorpay webhook registered against the same secret; TLS/HSTS/DNS/CDN posture (Vercel-managed).

---

## 3. Attack Surface Map

**Public (unauthenticated) routes**
- Marketing/content pages, `/blog`, `/newsletter`, `/link`, `/seo-expert-india`, `/support`, `/community` (read).
- **API:** `POST /api/support/order` (rate-limited, creates Razorpay order), `POST /api/support/confirm` (signature-gated), `POST /api/members/subscribe/confirm` (auth+signature), `POST /api/members/webhook` (HMAC raw-body), `POST /api/members/subscribe`.
- **Server action:** `submitContact` (public) → **M-2**.

**Authenticated (member) routes** — matcher in `proxy.ts` refreshes session; pages self-guard via `requireMember()`
- `/members/*`, `/games/profile/*`, `/tools/kalamai/*`, community engagement actions.
- **API:** `POST /api/kalamai/step` & `/analyses` — auth + **ownership** checked (`step/route.ts:20`), quota-capped.

**Admin routes** — `proxy.ts` (authed) **+** `admin/layout.tsx` `requireAdmin()` (identity) — double gate, fail-closed.
- `/admin/*` including integrations (SMTP/Kit creds), games, members, SEO, community moderation.

**Trust boundaries**
- Browser ⇄ Server: Supabase session cookie (httpOnly, SameSite=Lax by SSR default); JWT validated via `getUser()`.
- Server ⇄ DB: two clients — **anon** (RLS-enforced) vs **service-role** (RLS bypass, ownership enforced in code). This is the critical seam; verified correct on the money/kalamai paths.
- Server ⇄ Razorpay: HMAC signatures both directions.
- Crawler ⇄ Internet: `isBlockedHost()` egress filter.

**External integrations:** Supabase (own project only), Razorpay, DataForSEO (SERP), Anthropic (KalamAI), SMTP (Hostinger), Kit (currently hidden), Vercel Analytics/Speed Insights.

---

## 4. Security Architecture Review

- **Authentication:** Supabase Auth, server-validated JWTs everywhere, no `getSession()` trust. Session refresh centralized in `proxy.ts` with correct cookie propagation on redirects. **Strong.**
- **Authorization:** Layered — edge proxy (coarse) + server-component/layout guards (`requireAdmin`, `requireMember`) + RLS at the DB (fine-grained). Admin fails closed. Service-role writes enforce ownership in code. **Strong.**
- **Session management:** httpOnly SSR cookies; no tokens in `localStorage`/`sessionStorage`. **Good.**
- **Secret management:** `server-only` boundary on the service-role module; env-var indirection; nothing in the client bundle. Note L-3 (admin identity duplicated). **Good.**
- **Data protection / RLS:** RLS enabled on sensitive tables; `contacts` admin-only; `profiles` column-locked (no self-`is_founder`/`banned`) and moderation columns hidden from anon; `memberships` write-closed. SECURITY DEFINER functions pin `search_path = public`. **Strong.**
- **Network trust:** SSRF egress filter present (with documented rebinding/encoding residual); missing inbound security headers (M-1). **Adequate, improvable.**

---

## 5. Hardening Checklist

### Immediate (today) — closes the Medium cluster
1. **Add security headers (M-1)** — `next.config.ts`:
   ```ts
   async headers() {
     const csp = [
       "default-src 'self'",
       "img-src 'self' https://*.supabase.co data:",
       "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.vercel-scripts.com",
       "connect-src 'self' https://*.supabase.co https://api.razorpay.com https://*.vercel-insights.com",
       "frame-src https://api.razorpay.com https://checkout.razorpay.com",
       "frame-ancestors 'none'",
       "base-uri 'self'",
       "form-action 'self'",
     ].join("; ");
     return [{
       source: "/:path*",
       headers: [
         { key: "Content-Security-Policy", value: csp },
         { key: "X-Frame-Options", value: "DENY" },
         { key: "X-Content-Type-Options", value: "nosniff" },
         { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
         { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
       ],
     }];
   }
   ```
   *(Tune `script-src`/`connect-src` to the exact Razorpay/Vercel/Supabase origins in use; validate the checkout flow after enabling. Razorpay Checkout needs its frame + script origins allowed.)*

2. **Throttle the contact form (M-2)** — `src/lib/contact/actions.ts`:
   ```ts
   import { allow, clientIp } from "@/lib/rate-limit";
   import { headers } from "next/headers";
   // top of submitContact():
   if (!allow(`contact:${clientIp(await headers())}`, 3, 60_000)) {
     return { ok: false, error: "Too many messages. Please wait a minute." };
   }
   ```
   Add a hidden honeypot field to the form; if filled, return `{ ok: true }` without persisting/emailing. Consider only auto-replying after the throttle passes.

3. **Upgrade dependencies (D-1):** `npm audit fix`, bump `nodemailer` + `next`, re-run `npm audit` → expect 0 high.

### Short-term (this week)
4. **Durable rate limiting (M-3):** move `allow()` to Upstash/Vercel KV; keep the same signature.
5. **Strip CRLF (L-4)** from `name`/`projectType` before email headers.
6. **Verify Supabase Auth settings (L-5):** email confirmation on, leaked-password protection on, min password length ≥ 10, JWT/OTP expiry sane.

### Medium-term (this month)
7. **Storage hardening (L-2):** path-scope `community-media`/`support-media` writes to `auth.uid()`, restrict MIME, serve non-images as attachments.
8. **SSRF upgrade (L-1):** resolve-then-check + reject non-dotted IP literals in `block-host.ts`.
9. **Single admin source of truth (L-3):** reconcile `is_admin()` and the two TS gates; lowercase-compare consistently.
10. **Run Supabase Advisors** (`get_advisors` security lint) against the OWN project and clear findings.

### Long-term
11. CSP report-only → enforce pipeline with violation reporting.
12. Dependabot/Renovate + `npm audit` in CI as a gate.
13. Structured audit logging for admin actions and payment state transitions.
14. Consider WAF/bot mitigation (Vercel Firewall / Cloudflare Turnstile) on public write endpoints.

---

## 6. Final Verdict

**Is this application safe for production?** **Yes, conditionally.** No Critical or High *application* vulnerability was found. The auth, authorization, payment-verification, secret-handling, and RLS design are all sound and were clearly hardened deliberately. Close the Medium cluster (headers, contact throttling, dependency upgrades) on the launch checklist — none are architectural, all are quick.

**Top five risks (ranked):**
1. **M-2** Contact form abuse (spam + email-amplification via auto-reply).
2. **M-1** Missing security headers (CSP/X-Frame-Options — clickjacking + no XSS backstop).
3. **M-3** Rate limiting ineffective on serverless (login/order flooding).
4. **D-1** Vulnerable transitive deps (undici/nodemailer) — upgrade.
5. **L-5** Operational unknowns: confirm prod env vars + that all RLS migrations are actually applied live.

**Must fix before launch:** M-2 and M-1 (both are minutes of work), plus a `npm audit fix`. Confirm L-5 operationally (env + migrations applied) — a correct RLS design provides zero protection if the migration was never run against prod.

**Residual risk after fixes:**
- SSRF rebinding/encoding on the crawler (L-1) — low likelihood, bounded by SERP-sourced targets.
- Serverless rate limiting remains L1-only until moved to KV (M-3).
- Public storage buckets can host member-uploaded files until L-2 lands.
- DNS/TLS/CDN and Supabase project-level auth policy are outside static scope — verify in the dashboards.

---

*Static source review only. Dynamic testing (live auth flows, real payment replay, header inspection on the deployed domain, Supabase Advisor lint) is recommended to confirm the runtime items in L-5 and validate the CSP against the live Razorpay checkout.*
