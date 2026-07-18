# Auth & Onboarding Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split login/register into separate pages and replace Supabase's email-confirmation gate with a self-owned one — unverified users get a session and roam for 48h, then are blocked, and new accounts pass through a `/welcome` onboarding.

**Architecture:** We stop relying on Supabase's "Confirm email" enforcement (turned OFF manually) and own verification ourselves. Register creates the account, sends our branded confirm email, and signs the user in immediately. A pure age-gate helper drives login blocking after 48h; a daily cron hard-bans dormant unverified accounts. Clicking the branded link verifies, unbans, and routes to a `/welcome` onboarding wizard (username + referral, then a membership upsell that reuses the existing Razorpay `UpgradePanel`).

**Tech Stack:** Next.js (App Router, server actions, route handlers), Supabase (auth + Postgres, service-role admin client), Vitest, Vercel Cron, Razorpay (existing).

## Global Constraints

- **Supabase "Confirm email" enforcement MUST be OFF** (manual dashboard toggle). Without it, `signInWithPassword` fails for unverified users and Phases 2–3 cannot work. This is an owner action, tracked in Task 12.
- **Branding/copy:** monochrome, no emojis. Match existing tone (see `LoginForm`).
- **Grace window:** unverified accounts are usable for exactly **48 hours** from `created_at`.
- **No enumeration:** resend/reset actions always report success regardless of whether the email exists.
- **Migrations are owner-run:** write the `.sql` file; hand the owner the SQL to run. Never apply directly (per project Supabase workflow).
- **PR flow:** all work on branch `feat/auth-onboarding-rework`; never commit to `main`.
- **Redirect safety:** every post-auth destination passes through `safeNext`/`loginDestination` in `src/lib/auth/redirect.ts` — never redirect to a raw user-supplied path.
- **Membership home = `/members`.** Onboarding "skip" lands there; successful checkout lands on `/members/account`.

---

## File Structure

**Phase 1 — separate pages**
- Modify `src/lib/auth/actions.ts` — `createAccount`/`signUp` drop the confirm-password requirement.
- Create `src/app/register/page.tsx` — sign-up-only page.
- Modify `src/components/app/login-form.tsx` — sign-in-only (remove signup view); its "New here?" link points to `/register`.
- Create `src/components/app/register-form.tsx` — Name/Email/Password only.
- Modify `src/components/community/join-modal.tsx` — remove confirm-password field.

**Phase 2 — unverified session + check-email**
- Modify `src/lib/auth/actions.ts` — `signUp` establishes a session and redirects to `/verify-email`.
- Create `src/app/verify-email/page.tsx` — "open your email app" + skip.

**Phase 3 — login gate + 48h ban**
- Create `src/lib/auth/verification-gate.ts` (+ `.test.ts`) — pure age-gate helper.
- Modify `src/lib/auth/actions.ts` — `signIn` gate + `resendConfirmation` action.
- Modify `src/components/app/login-form.tsx` — render the "verify your email" + resend affordance.
- Create `supabase/migrations/20260718000001_block_unverified.sql` — `block_unverified_accounts()` RPC.
- Create `src/app/api/cron/block-unverified/route.ts` — daily cron handler.
- Modify `vercel.json` — add the cron entry.
- Modify `src/app/auth/confirm/route.ts` — unban on verify; redirect signup → `/welcome`.

**Phase 4 — onboarding**
- Create `supabase/migrations/20260718000002_onboarding.sql` — `profiles.onboarded_at`, `profiles.referral_source`, `set_username()` RPC.
- Create `src/lib/auth/onboarding-actions.ts` (+ validation test) — `saveOnboardingStep1`, `completeOnboarding`.
- Create `src/app/welcome/page.tsx` — wizard shell + gate.
- Create `src/components/onboarding/welcome-wizard.tsx` — step 1 (username + referral) and step 2 (membership) UI.

---

## Phase 1 — Separate pages + simplified register

### Task 1: Drop the confirm-password requirement in the signup action

**Files:**
- Modify: `src/lib/auth/actions.ts:58-101` (`createAccount`), `:104-119` (`signUp`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `createAccount` no longer reads/validates `confirm`; `signUp` reads only `name`, `email`, `password`, `next`.

- [ ] **Step 1: Simplify `createAccount` — remove the `confirm` parameter and its check**

In `src/lib/auth/actions.ts`, change the signature and delete the mismatch check:

```ts
async function createAccount(fields: {
  email: string;
  password: string;
  name: string;
  next: string;
}): Promise<{ error: string } | { ok: true; safe: string | null }> {
  const { email, password, name } = fields;

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  // (confirm-password check removed — single-entry signup, requirement 2)
  ...
```

Leave the rest of `createAccount` (generateLink + branded email) unchanged.

- [ ] **Step 2: Update `signUp` to stop passing `confirm`**

```ts
export async function signUp(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const result = await createAccount({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    next: String(formData.get("next") ?? ""),
  });
  if ("error" in result) return result;

  redirect(`/login?check=1${result.safe ? `&next=${encodeURIComponent(result.safe)}` : ""}`);
}
```

- [ ] **Step 3: Update `joinFromCommunity` to match (it still needs a confirmed password? no — single field now)**

Remove the confirm-field logic; the modal loses its confirm input in Task 4:

```ts
export async function joinFromCommunity(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await createAccount({
    email,
    password,
    name: String(formData.get("name") ?? "").trim(),
    next: String(formData.get("next") ?? ""),
  });
  if ("error" in result) return result;
  return { ok: true, email };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (If `password2` was referenced elsewhere, fix those references — expect none outside the forms edited in Task 2/4.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/actions.ts
git commit -m "feat(auth): single-entry signup — drop confirm-password field"
```

### Task 2: Create `/register` page and reduce `/login` to sign-in only

**Files:**
- Create: `src/app/register/page.tsx`
- Create: `src/components/app/register-form.tsx`
- Modify: `src/components/app/login-form.tsx`
- Modify: `src/app/login/page.tsx:15-43`

**Interfaces:**
- Consumes: `signUp`, `signIn`, `signInWithMagicLink` from `src/lib/auth/actions.ts`; `safeNext`, `loginDestination` from `src/lib/auth/redirect.ts`.
- Produces: `RegisterForm({ next?: string })` in `src/components/app/register-form.tsx`; `LoginForm` no longer accepts/handles a `signup` view.

- [ ] **Step 1: Create `RegisterForm` (Name, Email, Password — no confirm)**

Create `src/components/app/register-form.tsx`:

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { PasswordField } from "@/components/app/password-field";
import { signUp, type SignInState } from "@/lib/auth/actions";

export function RegisterForm({ next = "" }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signUp, undefined);
  const errRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (state?.error) errRef.current?.focus();
  }, [state]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo showWordmark />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join in a few seconds.</p>
      </div>

      <Card className="p-6">
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="next" value={next} />

          <div className="grid gap-1.5">
            <Label htmlFor="register-name">
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="register-name" name="name" type="text" autoComplete="name" placeholder="Your name" autoFocus />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="register-email">Email</Label>
            <Input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </div>

          <PasswordField
            id="register-password"
            name="password"
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            meter
          />

          {state?.error && (
            <p ref={errRef} tabIndex={-1} className="text-sm text-destructive outline-none" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" loading={pending} className="w-full">
            Create account
            {!pending && <ArrowRight />}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <Link href="/terms-of-use" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">Privacy Policy</Link>.
          </p>
        </form>
      </Card>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```


- [ ] **Step 2: Create the `/register` page (mirrors `/login` page's auth-skip guard)**

Create `src/app/register/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { RegisterForm } from "@/components/app/register-form";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { loginDestination, safeNext } from "@/lib/auth/redirect";

export const metadata = buildMetadata({
  title: "Create account",
  description: "Create your account.",
  path: "/register",
  noIndex: true,
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (user) redirect(loginDestination(next ?? null, user.email));

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <RegisterForm next={safeNext(next ?? null) ?? ""} />
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: Reduce `LoginForm` to sign-in only**

In `src/components/app/login-form.tsx`:
- Change `type View = "signin" | "magic";` (drop `"signup"`).
- Remove the `signup` entry from `HEADINGS`.
- Drop the `initialView` prop and its `signup` handling; `view` starts at `"signin"`.
- In `CredentialsForm`, remove the `signup` prop and all `signup &&` branches (name field, confirm field, mismatch state, terms text, action = `signUp`). It becomes sign-in only (`action = signIn`, `autoComplete="current-password"`).
- Replace the "New here? Create a free account" **button** (`onSwap`) with a **Link** to `/register`:

```tsx
<Link
  href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
>
  New here? Create a free account
</Link>
```

- Remove the now-unused `onSwap` prop and the `signUp` import.

- [ ] **Step 4: Update `/login` page — drop the `view`/`signup` handling**

In `src/app/login/page.tsx`, remove `view` from `searchParams` and the `signup`/`initialView` logic:

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; check?: string; error?: string; next?: string }>;
}) {
  const { reset, check, error, next } = await searchParams;

  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (user) redirect(loginDestination(next ?? null, user.email));

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <LoginForm
          next={safeNext(next ?? null) ?? ""}
          check={check === "1"}
          reset={reset === "1"}
          errorParam={error}
        />
      </Container>
    </Section>
  );
}
```

- [ ] **Step 5: Redirect `?view=signup` links to `/register`**

`UpgradePanel` (`src/components/members/upgrade-panel.tsx:113`) links to `/login?view=signup&next=...`. Change to `/register?next=...`:

```ts
router.push(`/register?next=${encodeURIComponent(next)}`);
```

Grep for other `view=signup` usages and update them:
Run: `grep -rn "view=signup" src/`
Expected: update each hit to `/register`.

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/register src/components/app/register-form.tsx src/components/app/login-form.tsx src/app/login/page.tsx src/components/members/upgrade-panel.tsx
git commit -m "feat(auth): separate /login and /register pages"
```

### Task 3: Remove the confirm-password field from the community join modal

**Files:**
- Modify: `src/components/community/join-modal.tsx:117-130`

**Interfaces:**
- Consumes: `joinFromCommunity` (already updated in Task 1).
- Produces: modal form submits `name`, `email`, `password`, `next` only.

- [ ] **Step 1: Delete the confirm-password `<div>` block**

Remove the entire block rendering `join-password2` (lines ~117–130). Leave name/email/password intact.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/join-modal.tsx
git commit -m "feat(community): single-entry join — drop confirm-password field"
```

---

## Phase 2 — Unverified session + check-email screen

### Task 4: Register signs the user in and routes to `/verify-email`

**Files:**
- Modify: `src/lib/auth/actions.ts` (`signUp`)

**Interfaces:**
- Consumes: `supabaseAuthServer` (already imported), `createAccount`.
- Produces: on success, `signUp` redirects to `/verify-email?email=<addr>&next=<safe>` with an active session.

- [ ] **Step 1: After `createAccount`, establish a session then redirect to `/verify-email`**

Replace the redirect in `signUp`:

```ts
export async function signUp(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const result = await createAccount({
    email,
    password,
    name: String(formData.get("name") ?? "").trim(),
    next: String(formData.get("next") ?? ""),
  });
  if ("error" in result) return result;

  // Sign them in immediately so they can use the app during the 48h grace window.
  // Requires Supabase "Confirm email" enforcement OFF (see plan Global Constraints);
  // if it is still ON this returns an error and we fall back to the check banner.
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?check=1${result.safe ? `&next=${encodeURIComponent(result.safe)}` : ""}`);
  }

  const params = new URLSearchParams({ email });
  if (result.safe) params.set("next", result.safe);
  redirect(`/verify-email?${params.toString()}`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/actions.ts
git commit -m "feat(auth): sign in on register, route to verify-email"
```

### Task 5: `/verify-email` screen with open-mail buttons and a skip link

**Files:**
- Create: `src/app/verify-email/page.tsx`

**Interfaces:**
- Consumes: `orderedProviders` from `src/lib/auth/mail-providers.ts`; `safeNext`, `loginDestination` from `src/lib/auth/redirect.ts`; `supabaseAuthServer`.
- Produces: a page at `/verify-email`.

- [ ] **Step 1: Build the page**

Create `src/app/verify-email/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck, ExternalLink, ArrowRight } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { orderedProviders } from "@/lib/auth/mail-providers";
import { safeNext, loginDestination } from "@/lib/auth/redirect";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export const metadata = buildMetadata({
  title: "Verify your email",
  description: "Confirm your email to finish setting up your account.",
  path: "/verify-email",
  noIndex: true,
});

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;

  // This screen is only meaningful for the just-signed-up (they have a session).
  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (!user) redirect("/login");
  if (user.email_confirmed_at) redirect(loginDestination(next ?? null, user.email));

  const address = email ?? user.email ?? "";
  const skipHref = loginDestination(safeNext(next ?? null), user.email);

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo />
            <MailCheck className="mt-5 size-8 text-foreground" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{address}</span>. Open it to verify your
              account.
            </p>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-2 gap-2">
              {orderedProviders(address).map((p) => (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-btn border border-border px-3 py-2 text-sm transition-ui hover:bg-accent"
                >
                  {p.label}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Nothing there? Check spam — it arrives within a minute.
            </p>
          </Card>

          <p className="mt-4 text-center text-sm">
            <Link
              href={skipHref}
              className="inline-flex items-center gap-1 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Skip for now, take me in
              <ArrowRight className="size-3.5" />
            </Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm `orderedProviders` returns `{ key, label, url }` (used identically in `join-modal.tsx`).

- [ ] **Step 3: Commit**

```bash
git add src/app/verify-email/page.tsx
git commit -m "feat(auth): verify-email screen with open-mail buttons and skip"
```

---

## Phase 3 — Login gate + 48h block

### Task 6: Pure age-gate helper (TDD)

**Files:**
- Create: `src/lib/auth/verification-gate.ts`
- Test: `src/lib/auth/verification-gate.test.ts`

**Interfaces:**
- Produces: `isUnverifiedPastGrace(user: { email_confirmed_at?: string | null; created_at: string }, now?: Date): boolean` and `GRACE_MS = 48 * 60 * 60 * 1000`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/verification-gate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isUnverifiedPastGrace, GRACE_MS } from "./verification-gate";

const now = new Date("2026-07-18T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

describe("isUnverifiedPastGrace", () => {
  it("false when the email is verified, regardless of age", () => {
    expect(
      isUnverifiedPastGrace({ email_confirmed_at: hoursAgo(1), created_at: hoursAgo(100) }, now),
    ).toBe(false);
  });

  it("false when unverified but inside the 48h window", () => {
    expect(isUnverifiedPastGrace({ email_confirmed_at: null, created_at: hoursAgo(47) }, now)).toBe(false);
  });

  it("true when unverified and older than 48h", () => {
    expect(isUnverifiedPastGrace({ email_confirmed_at: null, created_at: hoursAgo(49) }, now)).toBe(true);
  });

  it("false exactly at the boundary (48h is still allowed)", () => {
    expect(isUnverifiedPastGrace({ email_confirmed_at: null, created_at: hoursAgo(48) }, now)).toBe(false);
  });

  it("GRACE_MS is 48 hours", () => {
    expect(GRACE_MS).toBe(48 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/lib/auth/verification-gate.test.ts`
Expected: FAIL ("Cannot find module './verification-gate'").

- [ ] **Step 3: Implement**

Create `src/lib/auth/verification-gate.ts`:

```ts
/** The window a new account may use the app before verifying its email. */
export const GRACE_MS = 48 * 60 * 60 * 1000;

/**
 * True when an account is unverified AND older than the 48h grace window — the
 * point at which login is blocked until the address is confirmed. Verified
 * accounts are never blocked. `now` is injectable for tests.
 */
export function isUnverifiedPastGrace(
  user: { email_confirmed_at?: string | null; created_at: string },
  now: Date = new Date(),
): boolean {
  if (user.email_confirmed_at) return false;
  return now.getTime() - new Date(user.created_at).getTime() > GRACE_MS;
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/lib/auth/verification-gate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/verification-gate.ts src/lib/auth/verification-gate.test.ts
git commit -m "feat(auth): 48h verification grace-window helper"
```

### Task 7: Login gate + resend-confirmation action

**Files:**
- Modify: `src/lib/auth/actions.ts` (`signIn`; add `resendConfirmation`)
- Modify: `src/components/app/login-form.tsx` (render blocked state + resend)

**Interfaces:**
- Consumes: `isUnverifiedPastGrace` from `src/lib/auth/verification-gate.ts`; `supabaseAdmin`, `buildConfirmUrl`, `sendTemplate`, `confirmEmail` (already imported).
- Produces: `SignInState` gains a `needsVerification?: true` marker: `type SignInState = { error: string; needsVerification?: boolean } | undefined`. `resendConfirmation(_prev, formData): Promise<{ ok: true } | { error: string } | undefined>`.

- [ ] **Step 1: Widen `SignInState`**

```ts
export type SignInState = { error: string; needsVerification?: boolean } | undefined;
```

- [ ] **Step 2: Gate `signIn` after a successful password auth**

Replace the body after the `signInWithPassword` call:

```ts
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // A cron-banned unverified account fails here. Distinguish it so we can show
    // the verify prompt instead of "wrong password". Admin lookup runs only on
    // failed logins. ponytail: listUsers scans up to 1000 users; swap to a
    // by-email index/RPC if the user table outgrows that.
    const banned = await isUnverifiedAccount(email);
    if (banned) {
      return { error: "Verify your email before you log in.", needsVerification: true };
    }
    return { error: "Invalid email or password." };
  }

  // Signed in, but if the account is unverified past the 48h grace window, block
  // it now (covers accounts the daily cron hasn't banned yet).
  const u = data.user;
  if (u && isUnverifiedPastGrace({ email_confirmed_at: u.email_confirmed_at, created_at: u.created_at })) {
    await supabase.auth.signOut();
    return { error: "Verify your email before you log in.", needsVerification: true };
  }

  redirect(loginDestination(next, data.user?.email));
```

Add the import at the top of the file:

```ts
import { isUnverifiedPastGrace } from "@/lib/auth/verification-gate";
```

- [ ] **Step 3: Add the `isUnverifiedAccount` helper (by-email lookup)**

Add near the other helpers in `actions.ts`:

```ts
/** True if an account exists for this email and is not yet email-verified. */
async function isUnverifiedAccount(email: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = email.toLowerCase();
    const u = data?.users.find((x) => x.email?.toLowerCase() === target);
    return !!u && !u.email_confirmed_at;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Add the `resendConfirmation` action**

```ts
export type ResendState = { ok: true } | { error: string } | undefined;

/**
 * Re-mint and re-send the branded confirmation email for an unconfirmed account.
 * Always reports success (no enumeration), mirroring requestPasswordReset.
 */
export async function resendConfirmation(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  try {
    const origin_ = await origin();
    const dest = loginDestination(null, email);
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: "signup",
      email,
      options: { redirectTo: `${origin_}${dest}` },
    });
    const tokenHash = data?.properties?.hashed_token;
    if (!error && tokenHash) {
      const confirmUrl = buildConfirmUrl(origin_, tokenHash, "signup", dest);
      await sendTemplate(email, confirmEmail({ confirmUrl }));
    }
  } catch {
    // Swallow — never reveal whether the address exists.
  }
  return { ok: true };
}
```

- [ ] **Step 5: Render the resend affordance in `LoginForm`**

In `src/components/app/login-form.tsx`, inside `CredentialsForm`, after the error `<p>`, add a resend form shown only when `state?.needsVerification`:

```tsx
{state?.needsVerification && (
  <form action={resendAction} className="text-center">
    <input type="hidden" name="email" value={email} />
    <button type="submit" className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">
      {resendState && "ok" in resendState ? "Verification email sent — check your inbox." : "Resend verification email"}
    </button>
  </form>
)}
```

Wire the action near the top of `CredentialsForm`:

```tsx
import { signIn, signInWithMagicLink, resendConfirmation, type SignInState, type MagicLinkState, type ResendState } from "@/lib/auth/actions";
...
const [resendState, resendAction] = useActionState<ResendState, FormData>(resendConfirmation, undefined);
```

(`email` is already lifted in `LoginForm` and passed into `CredentialsForm`.)

- [ ] **Step 6: Typecheck + run the gate test**

Run: `npx tsc --noEmit && npx vitest run src/lib/auth/verification-gate.test.ts`
Expected: no type errors; 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/actions.ts src/components/app/login-form.tsx
git commit -m "feat(auth): block unverified logins past 48h + resend verification"
```

### Task 8: 48h cron ban — migration, RPC, route, schedule, unban-on-verify

**Files:**
- Create: `supabase/migrations/20260718000001_block_unverified.sql`
- Create: `src/app/api/cron/block-unverified/route.ts`
- Modify: `vercel.json`
- Modify: `src/app/auth/confirm/route.ts`

**Interfaces:**
- Consumes: `supabaseAdmin`, `CRON_SECRET` env.
- Produces: RPC `block_unverified_accounts()` returning `integer` (count banned).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260718000001_block_unverified.sql`:

```sql
-- Hard-block accounts that never verified their email within 48h. The app's
-- in-code gate (isUnverifiedPastGrace) already refuses their logins; this bans
-- dormant accounts so a stale session can't keep acting. Idempotent: skips rows
-- already banned into the future.
create or replace function public.block_unverified_accounts()
returns integer
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  n integer;
begin
  with blocked as (
    update auth.users
       set banned_until = now() + interval '100 years'
     where email_confirmed_at is null
       and created_at < now() - interval '48 hours'
       and (banned_until is null or banned_until < now())
    returning id
  )
  select count(*) into n from blocked;
  return n;
end;
$$;

revoke all on function public.block_unverified_accounts() from public, anon, authenticated;
```

- [ ] **Step 2: Write the cron route (mirrors birthday-greetings)**

Create `src/app/api/cron/block-unverified/route.ts`:

```ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Daily: ban accounts that never verified their email within 48h. Vercel Cron
 * hits this (see vercel.json) with `Authorization: Bearer ${CRON_SECRET}`.
 * Idempotent — the RPC skips already-banned rows.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron] CRON_SECRET not set; block-unverified disabled");
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin().rpc("block_unverified_accounts");
  if (error) {
    console.error("[cron] block_unverified_accounts failed:", error.message);
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, banned: data ?? 0 });
}
```

- [ ] **Step 3: Add the cron schedule**

In `vercel.json`, add to `crons` (runs 04:00, after the existing jobs):

```json
{ "path": "/api/cron/block-unverified", "schedule": "0 4 * * *" }
```

- [ ] **Step 4: Unban and route to onboarding on any email-confirmation verify**

In `src/app/auth/confirm/route.ts`, replace the existing signup-only welcome block. Both a `signup`-type link (fresh signup click) and a `magiclink`-type link (the resend from Task 7) are email confirmations: verifying either proves the address, so both must lift any 48h ban and run a not-yet-onboarded user through `/welcome`. Key the welcome mail + onboarding redirect on **`profiles.onboarded_at` being null**, NOT on the link `type` — otherwise a resend confirmation (magiclink) silently skips the welcome and onboarding. `recovery` links (which carry `next=/reset-password`) must NOT be treated as confirmations.

Add a top-of-file `import { supabaseAdmin } from "@/lib/supabase/server";`. Then:

```ts
  // signup click OR magiclink resend = an email confirmation. Recovery links
  // (next=/reset-password) fall through to the generic redirect below.
  if ((type === "signup" || type === "magiclink") && data.user) {
    // Verifying proves the address — lift any 48h cron ban.
    try {
      await supabaseAdmin().auth.admin.updateUserById(data.user.id, { ban_duration: "none" });
    } catch {
      // Non-fatal — verification succeeded regardless.
    }

    // Newcomers (not yet onboarded) get the welcome mail once and go to /welcome.
    // Keying on onboarded_at (not link type) means a resend confirmation is
    // treated identically to a first signup click.
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!prof?.onboarded_at) {
      if (data.user.email) {
        try {
          await sendTemplate(data.user.email, accountWelcome({ name: data.user.user_metadata?.full_name ?? null }));
        } catch {
          // Confirmation must succeed even if the welcome mail fails.
        }
      }
      const params = next ? `?next=${encodeURIComponent(next)}` : "";
      return NextResponse.redirect(`${origin}/welcome${params}`);
    }
    // Already onboarded (e.g. a later magiclink) — just land them.
    return NextResponse.redirect(`${origin}${next || loginDestination(null, data.user.email)}`);
  }

  const dest = next || loginDestination(null, data.user?.email);
  return NextResponse.redirect(`${origin}${dest}`);
```

(`profiles` has a public self-read RLS policy, so this select works under the session established by `verifyOtp`.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit (migration is owner-run — see Task 12)**

```bash
git add supabase/migrations/20260718000001_block_unverified.sql src/app/api/cron/block-unverified/route.ts vercel.json src/app/auth/confirm/route.ts
git commit -m "feat(auth): daily cron bans unverified >48h; unban + onboard on verify"
```

---

## Phase 4 — `/welcome` onboarding

### Task 9: Onboarding migration — columns + `set_username` RPC

**Files:**
- Create: `supabase/migrations/20260718000002_onboarding.sql`

**Interfaces:**
- Produces: `profiles.onboarded_at timestamptz`, `profiles.referral_source text`; RPC `set_username(p_username text)` returning `void` (raises on taken/invalid).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260718000002_onboarding.sql`:

```sql
-- Onboarding state + self-serve username.
alter table public.profiles add column if not exists onboarded_at   timestamptz;
alter table public.profiles add column if not exists referral_source text;

-- member_account_fields.sql re-scoped authenticated SELECT to an explicit column
-- list (withholding PII). onboarded_at is not sensitive and the /welcome page
-- reads it via the session client to gate re-onboarding, so grant it. Column
-- grants are additive. referral_source stays withheld — it is only ever written.
grant select (onboarded_at) on public.profiles to authenticated;

-- Let a signed-in user set their own username, with uniqueness + format rules.
-- security definer so the unique-violation is caught server-side and surfaced
-- as a friendly error. Callable by the authenticated user for their own row only
-- (uses auth.uid()).
create or replace function public.set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := trim(p_username);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if v !~ '^[a-zA-Z0-9_.]{3,30}$' then
    raise exception 'username must be 3-30 chars: letters, numbers, dot, underscore';
  end if;
  update public.profiles set username = v where id = auth.uid();
exception
  when unique_violation then raise exception 'username already taken';
end;
$$;

revoke all on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;
```

- [ ] **Step 2: Commit (owner runs the SQL — Task 12)**

```bash
git add supabase/migrations/20260718000002_onboarding.sql
git commit -m "feat(auth): onboarding columns + self-serve set_username RPC"
```

### Task 10: Onboarding server actions (username + referral, complete)

**Files:**
- Create: `src/lib/auth/onboarding-actions.ts`
- Test: `src/lib/auth/onboarding-actions.test.ts` (validation only)

**Interfaces:**
- Consumes: `supabaseAuthServer`, `safeNext`.
- Produces:
  - `validateUsername(raw: string): string | null` — returns an error string or null.
  - `saveOnboardingStep1(_prev, formData): Promise<{ error: string } | { ok: true } | undefined>` (sets username via RPC + `referral_source`).
  - `completeOnboarding(next: string | null): Promise<void>` — sets `onboarded_at`, redirects to `next`/`/members`.

- [ ] **Step 1: Write the failing validation test**

Create `src/lib/auth/onboarding-actions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateUsername } from "./onboarding-actions";

describe("validateUsername", () => {
  it("accepts a valid handle", () => {
    expect(validateUsername("shubham.d")).toBeNull();
  });
  it("rejects too short", () => {
    expect(validateUsername("ab")).toMatch(/3-30/);
  });
  it("rejects illegal characters", () => {
    expect(validateUsername("bad handle!")).toMatch(/letters/);
  });
  it("trims before validating", () => {
    expect(validateUsername("  ok_name  ")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/lib/auth/onboarding-actions.test.ts`
Expected: FAIL ("Cannot find module './onboarding-actions'").

- [ ] **Step 3: Implement the actions**

Create `src/lib/auth/onboarding-actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { safeNext } from "@/lib/auth/redirect";

/** Mirror of the DB rule in set_username. Returns an error string, or null if OK. */
export function validateUsername(raw: string): string | null {
  const v = raw.trim();
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(v)) {
    return "Username must be 3-30 chars: letters, numbers, dot, underscore.";
  }
  return null;
}

export type Step1State = { error: string } | { ok: true } | undefined;

/** Step 1: set username (via RPC) + referral source. */
export async function saveOnboardingStep1(
  _prev: Step1State,
  formData: FormData,
): Promise<Step1State> {
  const username = String(formData.get("username") ?? "");
  const referral = String(formData.get("referral") ?? "").trim();

  const invalid = validateUsername(username);
  if (invalid) return { error: invalid };

  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error: nameErr } = await supabase.rpc("set_username", { p_username: username.trim() });
  if (nameErr) {
    return { error: /taken/i.test(nameErr.message) ? "That username is taken." : "Could not set username." };
  }

  if (referral) {
    await supabase.from("profiles").update({ referral_source: referral }).eq("id", user.id);
  }
  return { ok: true };
}

/** Finish onboarding: stamp onboarded_at, then land on the destination. */
export async function completeOnboarding(next: string | null): Promise<void> {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  }
  redirect(safeNext(next) ?? "/members");
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/lib/auth/onboarding-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/onboarding-actions.ts src/lib/auth/onboarding-actions.test.ts
git commit -m "feat(auth): onboarding actions — username + referral, complete"
```

### Task 11: `/welcome` wizard page + UI

**Files:**
- Create: `src/app/welcome/page.tsx`
- Create: `src/components/onboarding/welcome-wizard.tsx`

**Interfaces:**
- Consumes: `getMemberContext` from `src/lib/members/session.ts`; `getActivePlans` from `src/lib/members/membership-server.ts`; `UpgradePanel`; `saveOnboardingStep1`, `completeOnboarding`, `validateUsername`; `safeNext`.
- Produces: pages/components only.

- [ ] **Step 1: Build the page (gate + data)**

Create `src/app/welcome/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { getMemberContext } from "@/lib/members/session";
import { getActivePlans } from "@/lib/members/membership-server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { safeNext } from "@/lib/auth/redirect";
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard";

export const metadata = buildMetadata({
  title: "Welcome",
  description: "Finish setting up your account.",
  path: "/welcome",
  noIndex: true,
});

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const { user, role } = await getMemberContext();
  if (!user) redirect("/login");

  const supabase = await supabaseAuthServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already onboarded → don't repeat the wizard.
  if (profile?.onboarded_at) redirect(safeNext(next ?? null) ?? "/members");

  const plans = await getActivePlans();

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <WelcomeWizard
          initialUsername={profile?.username ?? ""}
          plans={plans}
          email={user.email ?? undefined}
          isPremium={role === "premium" || role === "admin"}
          next={safeNext(next ?? null)}
        />
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Build the wizard component**

Create `src/components/onboarding/welcome-wizard.tsx`:

```tsx
"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UpgradePanel } from "@/components/members/upgrade-panel";
import type { MembershipPlan } from "@/lib/members/membership-server";
import {
  saveOnboardingStep1,
  completeOnboarding,
  validateUsername,
  type Step1State,
} from "@/lib/auth/onboarding-actions";

const REFERRALS = ["Search", "X / Twitter", "LinkedIn", "Instagram", "YouTube", "A friend", "Other"];

export function WelcomeWizard({
  initialUsername,
  plans,
  email,
  isPremium,
  next,
}: {
  initialUsername: string;
  plans: MembershipPlan[];
  email?: string;
  isPremium: boolean;
  next: string | null;
}) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const finish = completeOnboarding.bind(null, next);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex items-center justify-center gap-2">
        <Dot on={step >= 1} />
        <Dot on={step >= 2} />
      </div>

      {step === 1 ? (
        <StepOne initialUsername={initialUsername} onDone={() => setStep(2)} />
      ) : (
        <div className="grid gap-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Unlock everything</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Become a Member for the full archive, tools, and downloads. Or skip — you can upgrade anytime.
            </p>
          </div>
          <Card className="p-6">
            {isPremium ? (
              <p className="text-center text-sm text-muted-foreground">You&apos;re already a Member.</p>
            ) : (
              <UpgradePanel plans={plans} email={email} signedIn />
            )}
          </Card>
          <form action={finish}>
            <button type="submit" className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {isPremium ? "Continue" : "Skip for now"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function StepOne({ initialUsername, onDone }: { initialUsername: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<Step1State, FormData>(saveOnboardingStep1, undefined);
  const [username, setUsername] = React.useState(initialUsername);
  const localError = username.length > 0 ? validateUsername(username) : null;

  React.useEffect(() => {
    if (state && "ok" in state) onDone();
  }, [state, onDone]);

  return (
    <div className="grid gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome aboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a username and tell us how you found us.</p>
      </div>
      <Card className="p-6">
        <form action={action} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wizard-username">Username</Label>
            <Input
              id="wizard-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="yourhandle"
              required
              autoFocus
            />
            {localError && <p className="text-xs text-destructive">{localError}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="wizard-referral">Where did you hear about us?</Label>
            <select
              id="wizard-referral"
              name="referral"
              className="rounded-btn border border-border bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand"
              defaultValue=""
            >
              <option value="" disabled>Choose one…</option>
              {REFERRALS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          )}

          <Button type="submit" size="lg" loading={pending} disabled={!!localError} className="w-full">
            Continue
            {!pending && <ArrowRight />}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span className={`h-1.5 w-6 rounded-full ${on ? "bg-foreground" : "bg-border"}`} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm `getActivePlans` returns `MembershipPlan[]` (used identically by `/members/upgrade`).

- [ ] **Step 4: Commit**

```bash
git add src/app/welcome/page.tsx src/components/onboarding/welcome-wizard.tsx
git commit -m "feat(auth): /welcome onboarding wizard — username, referral, membership"
```

### Task 12: Owner actions + full verification

**Files:** none (operational).

- [ ] **Step 1: Owner turns OFF Supabase "Confirm email" enforcement**

Supabase Dashboard → Authentication → Providers → Email → disable "Confirm email". Without this, register cannot establish a session (Phase 2/3 degrade to the fallback banner). **Blocking for the feature to behave as designed.**

- [ ] **Step 2: Owner runs the two migrations**

Provide the SQL from `supabase/migrations/20260718000001_block_unverified.sql` and `20260718000002_onboarding.sql` for the owner to run in the Supabase SQL editor (per project workflow). Confirm `block_unverified_accounts` and `set_username` appear in `list_migrations`/function list.

- [ ] **Step 3: Full typecheck, tests, build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: types clean, all tests pass, build exits 0. (Trust the build exit code — a client importing a `server-only` module type-checks but breaks the build.)

- [ ] **Step 4: Manual smoke (dev server)**

Verify each requirement end-to-end:
1. `/register` shows Name/Email/Password only; `/login` is sign-in only; cross-links work.
2. Registering routes to `/verify-email` with open-mail buttons + skip; skip lands in `/members` (or `next`).
3. Branded confirm link → `/welcome`; step 1 sets username + referral; step 2 shows monthly/yearly + Buy + Skip; both land in `/members`.
4. Sign out, sign back in unverified within 48h → allowed. (Simulate >48h by backdating `created_at` in SQL on a test user → login shows "Verify your email before you log in." + resend.)
5. `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/block-unverified` → `{ ok: true, banned: N }`.
6. Login from `/games/login` / `/members/login` returns to the right home.

- [ ] **Step 5: Open the PR**

Per `AGENTS.md`, add a `Tweet:` line to the PR body (read `docs/PR-TWEET.md` first). Push `feat/auth-onboarding-rework` and open the PR against `main`.

---

## Notes / deliberate simplifications

- `isUnverifiedAccount` (Task 7) scans up to 1000 users via `listUsers` — reuses the existing `findUserIdByEmail` ceiling. Fine at current scale; swap to a by-email RPC if the user table grows. Runs only on **failed** logins.
- Onboarding step 2 reuses `UpgradePanel` verbatim (its "Become a Member" button opens the plan dialog). An inline plan-toggle variant is possible polish, not required — the checkout + Razorpay wiring is 100% reused.
- The community `JoinModal` deliberately keeps its own "check your email" ending (it never creates a session) — unchanged by this plan except the confirm-field removal.
```
