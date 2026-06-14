# Admin Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock `/admin/*` behind Supabase email+password auth for a single admin user, so later content slices (blog, etc.) can assume an authenticated admin.

**Architecture:** Add `@supabase/ssr` cookie-aware clients alongside the existing service-role/anon clients. A Next 16 `proxy.ts` (the renamed `middleware`) does an optimistic redirect of unauthenticated `/admin` visits to `/login`. A server-side Data Access Layer (`getAdminUser`/`requireAdmin`) re-verifies the session at the page layer (proxy is not the only line of defense). The existing `LoginForm` is wired to a `signIn` Server Action. A Postgres `is_admin()` function (email allowlist) is created now for later content-table RLS.

**Tech Stack:** Next.js 16.2.9 (App Router, `proxy.ts`, async `cookies()`), React 19 (`useActionState`), `@supabase/ssr`, `@supabase/supabase-js`, Supabase Auth + Postgres RLS.

---

## Critical version notes (verified against `node_modules/next/dist/docs/`)

- **`middleware.ts` is deprecated → use `proxy.ts`.** File lives next to `app/` (so `src/proxy.ts`). Export a function named `proxy` (or default). Defaults to the **Node.js runtime** (compatible with `@supabase/ssr`). Source: `01-app/03-api-reference/03-file-conventions/proxy.md`.
- **`cookies()` from `next/headers` is async** — always `await cookies()`. Source: `01-app/02-guides/authentication.md`.
- Proxy auth is **optimistic only** (read cookie/session); real auth checks happen in the page/layout DAL. Source: same authentication guide, "Optimistic checks with Proxy".

## Testing approach

This slice is integration-shaped (cookies, redirects, Supabase Auth) and the repo has **no test runner**. Installing one solely for auth adds no signal. Verification is done by running the dev server and driving the real redirect/login flow with the preview tools (`preview_start`, `preview_eval`, `preview_snapshot`, `preview_fill`, `preview_click`). A unit-test runner (Vitest) is introduced in the later blog plan where pure logic (visibility rule, block validation) is worth testing. This is verification, not skipping it — every task below ends with an observed-behavior check.

## File structure

- `supabase/migrations/20260614000002_admin_auth.sql` — `is_admin()` function (run manually per the SQL workflow).
- `src/lib/supabase/auth-server.ts` — cookie-aware server client (`@supabase/ssr`).
- `src/lib/auth/actions.ts` — `signIn` / `signOut` Server Actions.
- `src/lib/auth/session.ts` — DAL: `getAdminUser`, `requireAdmin`.
- `src/proxy.ts` — optimistic `/admin` gate + `/login` bounce.
- `src/components/app/login-form.tsx` — rewired to `signIn` (modify).
- `src/app/admin/layout.tsx` — admin shell, calls `requireAdmin()`.
- `src/app/admin/page.tsx` — minimal dashboard.
- `src/components/admin/sign-out-button.tsx` — logout control.
- `.env.local` — add `ADMIN_EMAIL` (modify; manual).

---

### Task 1: Install `@supabase/ssr`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the package**

Run: `npm install @supabase/ssr`
Expected: `package.json` dependencies gains `@supabase/ssr`; install exits 0.

- [ ] **Step 2: Verify it resolves**

Run: `node -e "require.resolve('@supabase/ssr'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(admin): add @supabase/ssr for cookie-based auth"
```

---

### Task 2: Create `is_admin()` Postgres function

**Files:**
- Create: `supabase/migrations/20260614000002_admin_auth.sql`

This function is the single source of truth for "is the current user the admin", used by RLS on later content tables. Single admin = email allowlist. **The literal email must be the email of the Supabase Auth user you will log in as.**

- [ ] **Step 1: Write the migration file**

```sql
-- Admin gate for RLS across content tables (posts, etc.).
-- Single-admin model: allowlist one email.
-- IMPORTANT: replace the literal below with the email of your admin Auth user.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'bookasloth@gmail.com', false);
$$;

comment on function public.is_admin() is
  'True when the current authenticated user is the site admin. Used by RLS policies on content tables.';

grant execute on function public.is_admin() to anon, authenticated;
```

- [ ] **Step 2: Hand the SQL to the user to run**

Per the project's manual-SQL workflow, do NOT apply it. Output the SQL above to the user with: "Run this in your Supabase SQL editor (your own project, not BAS). Set the email literal to the admin login email you'll use."

- [ ] **Step 3: Tell the user to create the admin Auth user**

Instruct: "In Supabase Dashboard → Authentication → Users → Add user, create a user with that same email + a password. No public signup exists, so this is the only way in." Wait for confirmation before relying on login in later verification.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260614000002_admin_auth.sql
git commit -m "feat(admin): add is_admin() RLS gate migration"
```

---

### Task 3: Cookie-aware server Supabase client

**Files:**
- Create: `src/lib/supabase/auth-server.ts`

This is separate from the existing `server.ts` (which uses `persistSession: false` for service-role/anon reads and must stay as-is). This new client reads/writes the auth session cookie.

- [ ] **Step 1: Write the client**

```ts
import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-aware Supabase client for auth (login session).
 * Reads/writes the session cookie via Next's async cookies() store.
 * Distinct from src/lib/supabase/server.ts, which is service-role/anon
 * read/write with no session.
 */
export async function supabaseAuthServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render where cookies are
            // read-only. Safe to ignore: proxy.ts refreshes the cookie.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `auth-server.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/auth-server.ts
git commit -m "feat(admin): add cookie-aware supabase auth server client"
```

---

### Task 4: Auth Server Actions (`signIn` / `signOut`)

**Files:**
- Create: `src/lib/auth/actions.ts`

- [ ] **Step 1: Write the actions**

```ts
"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type SignInState = { error: string } | undefined;

/** Used with React's useActionState in the login form. */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // redirect() throws to perform the redirect — keep it outside try/catch.
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `actions.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/actions.ts
git commit -m "feat(admin): add signIn/signOut server actions"
```

---

### Task 5: Session DAL (`getAdminUser` / `requireAdmin`)

**Files:**
- Create: `src/lib/auth/session.ts`

`getUser()` validates the JWT with Supabase (secure check, not just cookie decode). `requireAdmin()` is the real route guard used by the admin layout.

- [ ] **Step 1: Write the DAL**

```ts
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** Optional belt-and-suspenders email check. If unset, any authed user passes. */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/** Memoized per render: the validated current user, or null. */
export const getAdminUser = cache(async (): Promise<User | null> => {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) return null;
  return user;
});

/** Route guard: redirects to /login when not an authenticated admin. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 2: Add `ADMIN_EMAIL` to env (manual)**

Tell the user to add to `.env.local`: `ADMIN_EMAIL=bookasloth@gmail.com` (same email as the Auth user / `is_admin()` literal). Note it's optional but recommended.

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `session.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/session.ts
git commit -m "feat(admin): add admin session DAL (getAdminUser/requireAdmin)"
```

---

### Task 6: `proxy.ts` — optimistic `/admin` gate

**Files:**
- Create: `src/proxy.ts`

- [ ] **Step 1: Write the proxy**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 Proxy (renamed from middleware). Node.js runtime by default.
 * Optimistic auth gate only — pages re-verify via requireAdmin().
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
```

- [ ] **Step 2: Start the dev server**

Use `preview_start` (or `npm run dev`). Confirm it boots with no proxy/compile error in `preview_logs`.

- [ ] **Step 3: Verify unauthenticated redirect**

With `preview_eval` navigate to `/admin`, then `preview_snapshot`.
Expected: lands on `/login` (URL is `/login`, login card visible).

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(admin): gate /admin via proxy.ts (Next 16)"
```

---

### Task 7: Wire `LoginForm` to `signIn`

**Files:**
- Modify: `src/components/app/login-form.tsx`

Replace the demo submit + OAuth placeholders (we chose email+password single admin) with the real action. Keep existing UI components (Button, Input, Label, password show/hide).

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "@/lib/auth/actions";

export function LoginForm() {
  const [show, setShow] = React.useState(false);
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-btn p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
        {!pending && <ArrowRight />}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors. (Removed `useToast`, `Checkbox`, `Separator`, `Mail`, `GithubMark` usages — confirm no dangling imports remain in the file.)

- [ ] **Step 3: Verify the form renders**

With the dev server running, `preview_eval` navigate to `/login`, then `preview_snapshot`.
Expected: email + password fields + "Sign in" button; no GitHub/OAuth buttons.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/login-form.tsx
git commit -m "feat(admin): wire login form to signIn server action"
```

---

### Task 8: Admin shell layout + minimal dashboard + sign-out

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/sign-out-button.tsx`

Dashboard is intentionally minimal (nav + greeting). Entity counts (posts/subscribers) arrive when those tables exist in later slices.

- [ ] **Step 1: Write the sign-out button**

```tsx
"use client";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write the admin layout (real guard)**

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { SignOutButton } from "@/components/admin/sign-out-button";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  // later slices add: /admin/posts, /admin/subscribers
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl gap-8 px-4 py-8">
      <aside className="w-48 shrink-0 border-r pr-4">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Admin
        </p>
        <nav className="grid gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-btn px-2 py-1.5 text-sm hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="mb-6 flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <SignOutButton />
        </header>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write the dashboard page**

```tsx
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage your content from here. Blog management arrives next.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify the full auth flow end-to-end**

Dev server running, admin Auth user created (Task 2 Step 3), `ADMIN_EMAIL` set:
1. `preview_eval` navigate `/admin` → `preview_snapshot`: redirected to `/login`.
2. `preview_fill` email + password with the admin credentials; `preview_click` "Sign in".
3. `preview_snapshot`: now on `/admin`, shows "Dashboard" + the admin email + "Sign out".
4. `preview_eval` navigate `/login` → `preview_snapshot`: bounced back to `/admin` (already authed).
5. `preview_click` "Sign out" → `preview_snapshot`: back on `/login`.
6. `preview_eval` navigate `/admin` again → `preview_snapshot`: redirected to `/login` (session cleared).
Expected: all six behaviors as described. Check `preview_console_logs` for no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx src/components/admin/sign-out-button.tsx
git commit -m "feat(admin): admin shell, minimal dashboard, sign-out"
```

---

## Self-review

**Spec coverage (spec §5 Auth + §4 architecture admin gating):**
- `@supabase/ssr` added → Task 1. ✓
- Cookie session clients → Task 3 (server) + proxy inline client Task 6. ✓
- `proxy.ts` (middleware) gating `/admin` → Task 6. ✓
- `is_admin()` email-allowlist gate, no roles table → Task 2. ✓
- LoginForm wired to `signInWithPassword` → Task 7 (via `signIn` action). ✓
- Logout clears session → Task 4 `signOut` + Task 8 button. ✓
- Admin user created once manually, no public signup → Task 2 Step 3. ✓
- Success criterion "logged-out `/admin` → `/login`; login → `/admin`" → Task 6 Step 3, Task 8 Step 4. ✓
- Spec §12 constraint (verify Next 16 docs before middleware/server-client code) → done; `proxy.ts`/async `cookies()` reflected throughout. ✓

**Placeholder scan:** No TBD/TODO. Every code step shows complete code. The only deliberately-deferred items (entity counts, `/admin/posts` nav) are explicitly later-slice and not required by this plan's success criteria.

**Type consistency:** `SignInState` defined in Task 4, imported in Task 7. `signIn(_prev, formData)` signature matches `useActionState<SignInState, FormData>` usage. `getAdminUser`/`requireAdmin` defined Task 5, `requireAdmin` used Task 8. `signOut` defined Task 4, used Tasks 4-import in Task 8 button. `supabaseAuthServer` defined Task 3, used Tasks 4 & 5. Consistent.

**Scope:** Auth only. Posts/subscribers tables and CRUD are separate plans. Shippable on its own (login → gated dashboard → logout).
