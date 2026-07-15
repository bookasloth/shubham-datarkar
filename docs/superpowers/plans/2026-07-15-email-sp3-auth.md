# Email SP3 — Auth Emails (Welcome / Forgot Password / Password Changed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Brand the three auth-related emails through our catalog, sending them from our own server actions — no Supabase Send Email Hook, no dashboard config.

**Architecture:** Auth here is PKCE code-based (`exchangeCodeForSession`). Rather than let Supabase send plain auth emails, we send branded ones ourselves: `signUp` → `accountWelcome`; `updatePassword` → `passwordChanged`; `requestPasswordReset` → generate a recovery link via `supabaseAdmin().auth.admin.generateLink` (which does NOT auto-send) and send `forgotPassword` with a link to a new `/auth/confirm` route that verifies the `token_hash` and establishes the recovery session. All sends best-effort via `sendTemplate`.

**Tech Stack:** Next.js server actions + route handler, Supabase (`admin.generateLink`, `verifyOtp`), our `sendTemplate` + catalog.

## Global Constraints

- Best-effort email: every new send wrapped so it never throws into the auth action; auth still succeeds/redirects if mail fails.
- No account enumeration: `requestPasswordReset` always returns `{ ok: true }` regardless of whether the email exists (unchanged behavior).
- Don't break existing flows: magic-link (`/auth/callback`) and the `/reset-password` page/`updatePassword` action keep working. `updatePassword` already handles the no-`code` case (`if (code) exchange; then updateUser`) — the recovery session from `/auth/confirm` satisfies `updateUser` without a code.
- Base site URL: build absolute URLs from the request `origin()` helper already in `auth/actions.ts`.
- Branch: continue on `feat/emails-wiring`. Commit per task. Not deployed (manual gate).

## File Structure

- `src/lib/auth/confirm-url.ts` — CREATE: pure `buildConfirmUrl(origin, tokenHash, type, next)`.
- `src/lib/auth/confirm-url.test.ts` — CREATE.
- `src/app/auth/confirm/route.ts` — CREATE: GET handler, `verifyOtp({type, token_hash})` → redirect.
- `src/lib/auth/actions.ts` — MODIFY: `signUp` (send welcome), `requestPasswordReset` (generateLink + send branded), `updatePassword` (send password-changed).

---

### Task 1: `/auth/confirm` route + `buildConfirmUrl` helper

**Files:**
- Create: `src/lib/auth/confirm-url.ts`
- Test: `src/lib/auth/confirm-url.test.ts`
- Create: `src/app/auth/confirm/route.ts`

**Interfaces:**
- Produces: `buildConfirmUrl(origin: string, tokenHash: string, type: string, next?: string): string`

- [ ] **Step 1: Write the failing test**

`src/lib/auth/confirm-url.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildConfirmUrl } from "./confirm-url";

describe("buildConfirmUrl", () => {
  it("builds a confirm URL with token_hash + type", () => {
    const u = buildConfirmUrl("https://x.com", "abc", "recovery");
    expect(u).toBe("https://x.com/auth/confirm?token_hash=abc&type=recovery");
  });
  it("appends an encoded next", () => {
    const u = buildConfirmUrl("https://x.com", "abc", "recovery", "/reset-password");
    expect(u).toContain("next=%2Freset-password");
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run src/lib/auth/confirm-url.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `confirm-url.ts`**
```ts
/** Absolute URL to the /auth/confirm route that verifies an emailed token_hash. */
export function buildConfirmUrl(origin: string, tokenHash: string, type: string, next?: string): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  if (next) params.set("next", next);
  return `${origin}/auth/confirm?${params.toString()}`;
}
```

- [ ] **Step 4: Implement the route** `src/app/auth/confirm/route.ts`
```ts
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { loginDestination } from "@/lib/auth/redirect";

/**
 * Verifies an emailed token_hash (from admin.generateLink) and establishes the
 * session, then routes on. Recovery links carry next=/reset-password so the user
 * lands on the set-new-password form with an active recovery session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  if (!token_hash || !type) return NextResponse.redirect(`${origin}/login?error=link`);

  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) return NextResponse.redirect(`${origin}/login?error=link`);

  const dest = next || loginDestination(null, data.user?.email);
  return NextResponse.redirect(`${origin}${dest}`);
}
```

- [ ] **Step 5: Run test to verify pass** — `npx vitest run src/lib/auth/confirm-url.test.ts` → PASS. Then `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(auth): /auth/confirm token_hash verify route + buildConfirmUrl"
```

---

### Task 2: Send branded auth emails from the actions

**Files:**
- Modify: `src/lib/auth/actions.ts`

**Interfaces:**
- Consumes: `sendTemplate` (`@/lib/email/send-template`), `accountWelcome`/`forgotPassword` (`@/lib/email/templates/auth`), `passwordChanged` (`@/lib/email/templates/auth`), `buildConfirmUrl` (Task 1), `supabaseAdmin` (`@/lib/supabase/server`), `getUserEmail` (`@/lib/email/user-email`).

- [ ] **Step 1: Welcome on signup**

In `signUp`, after `if (error) return { error: error.message };` and before the `redirect(...)`, add a best-effort welcome:
```ts
import { sendTemplate } from "@/lib/email/send-template";
import { accountWelcome, forgotPassword, passwordChanged } from "@/lib/email/templates/auth";
// ...
  try { await sendTemplate(email, accountWelcome({})); } catch {}
```
(Name isn't collected at signup; `accountWelcome({})` greets generically. `email` is already in scope.)

- [ ] **Step 2: Branded reset via generateLink**

Replace the body of `requestPasswordReset` (keep the always-`{ ok: true }` return):
```ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { buildConfirmUrl } from "@/lib/auth/confirm-url";
// ...
export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  try {
    const origin_ = await origin();
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin_}/reset-password` },
    });
    const tokenHash = data?.properties?.hashed_token;
    if (!error && tokenHash) {
      const resetUrl = buildConfirmUrl(origin_, tokenHash, "recovery", "/reset-password");
      await sendTemplate(email, forgotPassword({ resetUrl }));
    }
  } catch {
    // Swallow — never reveal whether the address exists (no enumeration).
  }
  return { ok: true };
}
```

- [ ] **Step 3: Password-changed notice**

In `updatePassword`, after the successful `updateUser` and before `redirect("/login?reset=1")`:
```ts
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) await sendTemplate(user.email, passwordChanged({}));
  } catch {}
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` (clean) and `npx eslint src/lib/auth src/app/auth` (0). Confirm no NEW test failures: `npx vitest run` (4 pre-existing unrelated failures only).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(auth): branded welcome, reset, and password-changed emails"
```

---

## Self-Review

**Spec coverage:** Welcome (Task 2.1) ✓, Forgot Password (Task 2.2 + Task 1 route) ✓, Password Changed (Task 2.3) ✓. Send Email Hook intentionally NOT used — direct sends cover all three flows we control; simpler and no dashboard config.

**Type consistency:** `buildConfirmUrl(origin, tokenHash, type, next)` used identically in Task 1 and Task 2.2. `accountWelcome({})`/`forgotPassword({resetUrl})`/`passwordChanged({})` match the SP1/owner-copy signatures.

**Risk:** `requestPasswordReset` switches from `resetPasswordForEmail` (PKCE) to `admin.generateLink` (token_hash) + `/auth/confirm`. Existing `/reset-password` + `updatePassword` handle the no-`code` recovery-session case already. Verify the reset flow end-to-end after deploy (documented in the user instructions).

**Open verification for the implementer:** confirm `admin.generateLink` recovery result exposes `data.properties.hashed_token` in the installed `@supabase/supabase-js` version (it does in v2). If the field differs, adjust the accessor and note it.
