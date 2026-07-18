# Profile Photo v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in member upload a profile photo that replaces their deterministic icon avatar, shown on the account page and public profile pages, removable by owner and admin.

**Architecture:** A dedicated public `member-avatars` Supabase Storage bucket (policies mirrored from the existing `community-media` bucket). A service-role server action validates + uploads, stores the public URL in a new `profiles.avatar_url` column, and cleans up the prior object. `CommunityAvatar` gains an optional `src` prop and renders `<img>` when set, else the current icon — so every existing caller is untouched. Profile surfaces fetch `avatar_url` and pass it; the feed stays on icons until Phase 2.

**Tech Stack:** Next.js (App Router, server actions), Supabase (Postgres + Storage, service-role + auth clients), TypeScript, Vitest, Tailwind.

## Global Constraints

- **Next.js is a modified build** — read the relevant guide in `node_modules/next/dist/docs/` before writing framework code; heed deprecation notices. (AGENTS.md)
- **Migrations are manual SQL** — write the migration file, hand the user the SQL to run. NEVER apply directly to Supabase. (user workflow)
- **This is the OWN Supabase** (ref `oyzzgjrefkppqkxjccot`), never the connected BAS project.
- **PR auto-posts a note to `/community`** — feat scope, non-noise. The PR body MUST carry a `Tweet:` line per `docs/PR-TWEET.md` (write five, ship one) or CI fails. Call these **notes**, not tweets.
- **Design prefs:** monochrome, no emojis, Jakarta + Poppins, velocity-first.
- **Verify the build exit code** — a client component importing `server-only` passes `tsc` but breaks `next build`. Trust the build, not tsc alone.
- **Don't merge until owner OK**; verify prod HTML after merge (auto-deploy is unreliable).
- Branch already created: `feat/profile-photo` (from `origin/main`). The design spec is committed there: `docs/superpowers/specs/2026-07-18-profile-photo-v1-design.md`.

---

## File Structure

- `src/lib/media/image-upload.ts` — **new.** Shared raster-image validation: `MAX_IMAGE_BYTES`, `ALLOWED_IMAGE_TYPES`, `validateImageFile(file)`, `imageExt(file)`. Pure, unit-tested. Consumed by both the new avatar action and the existing community action (DRY).
- `src/lib/media/image-upload.test.ts` — **new.** Vitest unit tests for the helper.
- `src/lib/community/actions.ts` — **modify.** Replace its local `MAX_BYTES` / `ALLOWED_IMAGE_TYPES` / inline checks with the shared helper.
- `supabase/migrations/20260718000001_member_avatars.sql` — **new (manual).** `avatar_url` column, SELECT column grants (authenticated + anon), `member-avatars` bucket, 3 storage policies.
- `src/lib/members/avatar-actions.ts` — **new.** `uploadAvatar`, `removeAvatar`, `removeAvatarAsAdmin` server actions.
- `src/components/community/community-avatar.tsx` — **modify.** Add optional `src` prop.
- `src/components/members/avatar-uploader.tsx` — **new.** Client uploader (file input, preview, upload/remove).
- `src/app/members/account/page.tsx` — **modify.** Fetch `avatar_url`, render a Photo section with the uploader.
- `src/lib/community/queries.ts` — **modify.** `getProfileByUsername` selects + returns `avatarUrl`.
- `src/app/community/u/[username]/page.tsx` — **modify.** Pass `src={profile.avatarUrl}` to the header avatar.
- `src/app/community/me/page.tsx` — **modify.** Fetch + pass viewer's `avatar_url`.
- `src/app/admin/members/page.tsx` — **modify.** Surface a "remove avatar" control calling `removeAvatarAsAdmin`.

**Testability note for this stack:** only the pure validation helper (Task 1) supports meaningful unit tests — the vitest suite (`vitest run`) has no jsdom/Supabase harness, and the storage/DB/auth paths are integration surfaces behind a member login. Those tasks gate on `tsc` + `eslint` + `next build`, and the whole feature gets one live verification pass at the end (Task 9). This is deliberate, not a gap.

---

### Task 1: Shared image-validation helper

**Files:**
- Create: `src/lib/media/image-upload.ts`
- Test: `src/lib/media/image-upload.test.ts`
- Modify: `src/lib/community/actions.ts:8-12,45-48`

**Interfaces:**
- Produces:
  - `MAX_IMAGE_BYTES: number` (= `5 * 1024 * 1024`)
  - `ALLOWED_IMAGE_TYPES: Set<string>` (jpeg, png, webp, gif, avif)
  - `validateImageFile(file: File): string | null` — returns an error message, or `null` if valid.
  - `imageExt(file: File): string` — lowercased, alphanumeric-stripped extension, `"bin"` fallback.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/media/image-upload.test.ts
import { describe, it, expect } from "vitest";
import { validateImageFile, imageExt, MAX_IMAGE_BYTES } from "./image-upload";

function fileOf(type: string, bytes: number, name = "x.jpg"): File {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  return new File([blob], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a small jpeg", () => {
    expect(validateImageFile(fileOf("image/jpeg", 10))).toBeNull();
  });
  it("rejects svg (stored-XSS risk)", () => {
    expect(validateImageFile(fileOf("image/svg+xml", 10, "x.svg"))).toMatch(/JPG|PNG|WebP|GIF|AVIF/);
  });
  it("rejects a file over the size cap", () => {
    expect(validateImageFile(fileOf("image/png", MAX_IMAGE_BYTES + 1, "x.png"))).toMatch(/5MB/);
  });
});

describe("imageExt", () => {
  it("lowercases and strips", () => {
    expect(imageExt(new File([], "PHOTO.JPEG"))).toBe("jpeg");
  });
  it("falls back to bin when extensionless", () => {
    expect(imageExt(new File([], "photo"))).toBe("bin");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/media/image-upload.test.ts`
Expected: FAIL — cannot resolve module `./image-upload`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/media/image-upload.ts
// Shared raster-image upload validation. Raster only: `startsWith("image/")`
// would admit image/svg+xml, and an SVG can carry <script> — these buckets are
// public and served inline from *.supabase.co (audit L-2).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/** Error message string, or null when the file is an acceptable image. */
export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return "Image must be under 5MB.";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Use a JPG, PNG, WebP, GIF, or AVIF image.";
  return null;
}

/** Lowercased, alphanumeric-only file extension; "bin" when absent. */
export function imageExt(file: File): string {
  return (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/media/image-upload.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Refactor community/actions.ts to use the helper (DRY)**

In `src/lib/community/actions.ts`: delete the local `MAX_BYTES` and `ALLOWED_IMAGE_TYPES` (lines 9-12), import from the helper, and replace the per-file loop checks (lines 45-48) so each file runs `validateImageFile`. Reuse `imageExt` for the extension at line 52.

```ts
// top of file, with the other imports
import { validateImageFile, imageExt } from "@/lib/media/image-upload";
```

```ts
// replace the size/type checks in the `for (const f of files)` validation loop
for (const f of files) {
  const err = validateImageFile(f);
  if (err) return { error: err };
}
```

```ts
// at the upload site, replace the inline ext expression
const ext = imageExt(f);
```

Keep `const BUCKET = "community-media";` as-is.

- [ ] **Step 6: Verify build + existing behavior unchanged**

Run: `npx tsc --noEmit` → no new errors (the pre-existing `js-yaml` test error is unrelated).
Run: `npx eslint src/lib/media/image-upload.ts src/lib/community/actions.ts` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/media/image-upload.ts src/lib/media/image-upload.test.ts src/lib/community/actions.ts
git commit -m "refactor(media): shared image-upload validation helper"
```

---

### Task 2: Migration — column, grants, bucket, policies (manual SQL)

**Files:**
- Create: `supabase/migrations/20260718000001_member_avatars.sql`

**Interfaces:**
- Produces: `profiles.avatar_url text` (readable by `authenticated` + `anon`); public bucket `member-avatars` with read / owner-write / admin-delete policies.

- [ ] **Step 1: Investigate the current anon column grants**

The `avatar_url` SELECT grant must match how `anon` already reads `profiles`. Before writing the grant, confirm what `anon` is currently granted (the account-fields migration only re-scoped `authenticated`):

Ask the user to run, or check via the Supabase SQL tool:
```sql
select grantee, string_agg(column_name, ', ' order by column_name) as cols
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles' and privilege_type = 'SELECT'
group by grantee;
```
Expected: `authenticated` has the named column list from `20260714000001`; note whether `anon` has table-wide or column SELECT. Write Step 2's grant to add `avatar_url` for **whichever roles render profiles** (at minimum `authenticated`; add `anon` if the public profile page reads via the anon client — it does, via `supabaseAuthServer`/anon in `getProfileByUsername`).

- [ ] **Step 2: Write the migration file**

```sql
-- =====================================================================
-- Member profile photos. Target: OWN Supabase (ref oyzzgjrefkppqkxjccot).
-- NOT the BAS project. Apply MANUALLY. Idempotent.
-- Mirrors the community-media bucket pattern (20260710000004 / _13000002).
-- =====================================================================

-- 1. column
alter table public.profiles add column if not exists avatar_url text;

-- 2. make avatar_url readable. The account-fields migration re-scoped
-- authenticated SELECT to a named column list; add avatar_url to it. anon
-- renders public profile pages, so it needs the column too.
grant select (avatar_url) on public.profiles to authenticated, anon;

-- 3. bucket
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do nothing;

-- 4a. public read
drop policy if exists member_avatars_public_read on storage.objects;
create policy member_avatars_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'member-avatars');

-- 4b. owner-folder write (defense in depth: real uploads use the service role).
-- Own {auth.uid()}/ folder only; raster extensions only (no svg/html).
drop policy if exists member_avatars_owner_write on storage.objects;
create policy member_avatars_owner_write
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','avif')
  );

-- 4c. admin delete (moderation)
drop policy if exists member_avatars_admin_delete on storage.objects;
create policy member_avatars_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-avatars' and public.is_admin());
```

If Step 1 shows `anon` reads `profiles` table-wide (not column-scoped), the `grant ... to anon` is harmless (idempotent superset); keep it for clarity.

Note — no UPDATE grant here on purpose. `security_hardening.sql` column-allowlists the authenticated UPDATE on `profiles` to `(username, display_name, bio)`; Task 3 writes `avatar_url` through the **service-role** client (after authenticating the user) rather than widening that allowlist, keeping the writable-column surface minimal.

- [ ] **Step 3: Hand the SQL to the user to run**

Do NOT apply. Tell the user: "Run `supabase/migrations/20260718000001_member_avatars.sql` against the own Supabase project, then confirm." Wait for confirmation before relying on the column/bucket in later live verification.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260718000001_member_avatars.sql
git commit -m "feat(members): migration for member-avatars bucket + avatar_url"
```

---

### Task 3: Avatar server actions

**Files:**
- Create: `src/lib/members/avatar-actions.ts`

**Interfaces:**
- Consumes: `validateImageFile`, `imageExt` (Task 1); `supabaseAuthServer` (`@/lib/supabase/auth-server`), `supabaseAdmin` (`@/lib/supabase/server`).
- Produces:
  - `uploadAvatar(formData: FormData): Promise<{ ok: true } | { error: string }>`
  - `removeAvatar(): Promise<{ ok: true } | { error: string }>`
  - `removeAvatarAsAdmin(userId: string): Promise<{ ok: true } | { error: string }>`

- [ ] **Step 1: Write the actions file**

```ts
// src/lib/members/avatar-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";

const BUCKET = "member-avatars";

export type AvatarState = { ok: true } | { error: string };

/** Remove every stored object under a user's avatar folder. Non-fatal on
 *  failure — a lingering orphan is cleaned by the next successful upload.
 *  ponytail: no retry; a stale object is cosmetic, not a correctness bug. */
async function clearFolder(admin: ReturnType<typeof supabaseAdmin>, uid: string): Promise<void> {
  const { data } = await admin.storage.from(BUCKET).list(uid);
  if (data && data.length) {
    await admin.storage.from(BUCKET).remove(data.map((o) => `${uid}/${o.name}`));
  }
}

function revalidateProfiles(handle?: string | null): void {
  revalidatePath("/members/account");
  revalidatePath("/community/me");
  if (handle) revalidatePath(`/community/u/${handle}`);
}

export async function uploadAvatar(formData: FormData): Promise<AvatarState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };

  const admin = supabaseAdmin();
  // Fresh path per upload = free cache-bust vs a stable CDN URL.
  const path = `${user.id}/${Date.now()}.${imageExt(file)}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  // Write via the service role: security_hardening.sql column-allowlists the
  // authenticated UPDATE on profiles to (username, display_name, bio), so an
  // auth-client update of avatar_url is silently denied. We've already
  // authenticated the user above, and scope the write to their own id.
  const { error: dbErr } = await admin.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
  if (dbErr) return { error: "Could not save your photo." };

  // Remove the previous object(s) only after the new one is committed.
  const { data: prev } = await admin.storage.from(BUCKET).list(user.id);
  const current = path.split("/")[1];
  const stale = (prev ?? []).filter((o) => o.name !== current).map((o) => `${user.id}/${o.name}`);
  if (stale.length) await admin.storage.from(BUCKET).remove(stale);

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const admin = supabaseAdmin();
  await clearFolder(admin, user.id);
  // Service role: profiles UPDATE is column-allowlisted to username/display_name/bio
  // for authenticated (security_hardening.sql). Own id only.
  const { error } = await admin.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return { error: "Could not remove your photo." };

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function removeAvatarAsAdmin(userId: string): Promise<AvatarState> {
  const sb = await supabaseAuthServer();
  // Server-side admin gate, not just storage RLS.
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return { error: "Not authorised." };

  const admin = supabaseAdmin();
  await clearFolder(admin, userId);
  const { error } = await admin.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return { error: "Could not remove that photo." };

  const { data: p } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  revalidatePath("/admin/members");
  return { ok: true };
}
```

- [ ] **Step 2: Verify types + lint**

Run: `npx tsc --noEmit` → no new errors.
Run: `npx eslint src/lib/members/avatar-actions.ts` → clean.
Note: confirm `is_admin` is the correct RPC name — grep `rpc("is_admin"` / `is_admin()` in the repo; the storage policy uses `public.is_admin()`. If the callable RPC differs, match the existing admin-check pattern used elsewhere in `src/lib/games/admin-*` or `src/app/admin`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/members/avatar-actions.ts
git commit -m "feat(members): avatar upload/remove server actions"
```

---

### Task 4: Extend CommunityAvatar with optional `src`

**Files:**
- Modify: `src/components/community/community-avatar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CommunityAvatar({ seed, src?, size? })` — renders `<img src>` when `src` is a non-empty string, else the deterministic icon. `src` optional → all existing callers unchanged.

- [ ] **Step 1: Update the component**

```tsx
import { avatarUrl, avatarBg } from "@/lib/utils";

/**
 * Member avatar. With `src` (a stored profile photo) it renders that image;
 * without, it falls back to one of 12 fixed CDN icons on a milk backdrop, both
 * derived from `seed` (the stable username) so the icon is assigned once and
 * never changes. Plain <img>: the hosts are CSP-allowed but decorative and
 * small, so next/image optimization isn't worth the config.
 */
export function CommunityAvatar({
  seed,
  src,
  size = 40,
}: {
  seed: string;
  src?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, background: src ? undefined : avatarBg(seed) }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || avatarUrl(seed)}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
```

- [ ] **Step 2: Verify types + lint**

Run: `npx tsc --noEmit` → no new errors (optional prop keeps every existing call site valid).
Run: `npx eslint src/components/community/community-avatar.tsx` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/community-avatar.tsx
git commit -m "feat(community): CommunityAvatar renders a custom src when set"
```

---

### Task 5: AvatarUploader client component

**Files:**
- Create: `src/components/members/avatar-uploader.tsx`

**Interfaces:**
- Consumes: `uploadAvatar`, `removeAvatar` (Task 3); `validateImageFile` (Task 1); `CommunityAvatar` (Task 4); `Button` (`@/components/ui/button`).
- Produces: `AvatarUploader({ seed, current })` where `current: string | null` is the stored `avatar_url`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { uploadAvatar, removeAvatar } from "@/lib/members/avatar-actions";
import { validateImageFile, ALLOWED_IMAGE_TYPES } from "@/lib/media/image-upload";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { Button } from "@/components/ui/button";

export function AvatarUploader({ seed, current }: { seed: string; current: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File) {
    const invalid = validateImageFile(file); // client-side fast feedback; server re-checks
    if (invalid) { setError(invalid); return; }
    setError(null);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.set("avatar", file);
    start(async () => {
      const res = await uploadAvatar(fd);
      if ("ok" in res) {
        // Server stored a fresh URL; keep showing the local preview until reload.
        setSaved(preview);
      } else {
        setError(res.error);
        setPreview(null);
      }
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeAvatar();
      if ("ok" in res) { setSaved(null); setPreview(null); }
      else setError(res.error);
    });
  }

  const shown = preview ?? saved;

  return (
    <div className="flex items-center gap-4">
      <CommunityAvatar seed={seed} src={shown} size={64} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={pending}
            onClick={() => inputRef.current?.click()}
          >
            {saved ? "Change photo" : "Upload photo"}
          </Button>
          {saved && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={[...ALLOWED_IMAGE_TYPES].join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <p className="text-muted-foreground text-xs">JPG, PNG, WebP, GIF, or AVIF. Under 5MB.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types + lint**

Run: `npx tsc --noEmit` → no new errors.
Run: `npx eslint src/components/members/avatar-uploader.tsx` → clean.
Confirm `Button` accepts a `loading` prop (used by `UsernameForm`/`PersonalDetailsCard` — it does).

- [ ] **Step 3: Commit**

```bash
git add src/components/members/avatar-uploader.tsx
git commit -m "feat(members): AvatarUploader client component"
```

---

### Task 6: Wire the uploader into the account page

**Files:**
- Modify: `src/app/members/account/page.tsx`

**Interfaces:**
- Consumes: `AvatarUploader` (Task 5). The page already fetches the profile row (`select("username")`); extend to `avatar_url`.

- [ ] **Step 1: Extend the profile fetch + render the Photo section**

Change the profile select to include `avatar_url`:
```tsx
const { data: profile } = await supabase
  .from("profiles")
  .select("username, avatar_url")
  .eq("id", user!.id)
  .maybeSingle();
```

Add the import:
```tsx
import { AvatarUploader } from "@/components/members/avatar-uploader";
```

Add a Photo section inside the grid, directly above the Username section from #233:
```tsx
<section className="rounded-card border border-border bg-card p-4">
  <h2 className="text-sm font-semibold">Photo</h2>
  <div className="mt-3">
    <AvatarUploader
      seed={profile?.username ?? user!.email ?? "member"}
      current={(profile?.avatar_url as string | null) ?? null}
    />
  </div>
</section>
```

- [ ] **Step 2: Verify build (client→server-only trap lives here)**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → **exit 0**. This is the gate that catches a client component pulling in `server-only` transitively. Trust the exit code.

- [ ] **Step 3: Commit**

```bash
git add src/app/members/account/page.tsx
git commit -m "feat(members): photo upload section on the account page"
```

---

### Task 7: Show the photo on public/self profile pages

**Files:**
- Modify: `src/lib/community/queries.ts:179-199` (`getProfileByUsername`)
- Modify: `src/app/community/u/[username]/page.tsx:80`
- Modify: `src/app/community/me/page.tsx`

**Interfaces:**
- Produces: `getProfileByUsername` return type gains `avatarUrl: string | null`.

- [ ] **Step 1: Add avatar_url to getProfileByUsername**

In `src/lib/community/queries.ts`, extend the select and the return shape:
```ts
export async function getProfileByUsername(
  username: string,
): Promise<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; badge: Badge } | null> {
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  const { data: badge } = await sb.rpc("community_badge", { p_user: data.id });
  return {
    id: data.id as string,
    username: data.username as string,
    displayName: (data.display_name as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    badge: ((badge as Badge) ?? "grey") satisfies Badge,
  };
}
```

- [ ] **Step 2: Pass src on the public profile header**

In `src/app/community/u/[username]/page.tsx`, line ~80:
```tsx
<CommunityAvatar seed={profile.username} src={profile.avatarUrl} size={48} />
```

- [ ] **Step 3: Fetch + pass src on /community/me**

`/community/me` currently has only `handle`. Read the viewer's `avatar_url` and pass it. After the `viewerHandle()` block:
```tsx
const sb = await supabaseAuthServer();
const { data: meProfile } = await sb
  .from("profiles")
  .select("avatar_url")
  .eq("id", user.id)
  .maybeSingle();
```
Add the import `import { supabaseAuthServer } from "@/lib/supabase/auth-server";` and update the header avatar:
```tsx
<CommunityAvatar seed={handle} src={(meProfile?.avatar_url as string | null) ?? null} size={48} />
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/community/queries.ts src/app/community/u/[username]/page.tsx src/app/community/me/page.tsx
git commit -m "feat(community): show custom avatar on profile pages"
```

---

### Task 8: Admin remove-avatar control

**Files:**
- Modify: `src/app/admin/members/page.tsx`

**Interfaces:**
- Consumes: `removeAvatarAsAdmin` (Task 3).

- [ ] **Step 1: Read the admin members page to match its existing pattern**

Read `src/app/admin/members/page.tsx` first — follow how it already renders per-member rows and any existing server-action buttons (form `action={...}` vs a client control). Add a "Remove photo" control only for members whose `avatar_url` is set. If the page's member query doesn't already select `avatar_url`, add it.

- [ ] **Step 2: Wire the control**

Minimal form-action button per member row (mirror the page's existing action buttons):
```tsx
<form action={async () => { "use server"; await removeAvatarAsAdmin(m.id); }}>
  <button type="submit" className="text-xs text-danger hover:underline">Remove photo</button>
</form>
```
If the page is a client component, instead import `removeAvatarAsAdmin` and call it from an existing client handler with a confirm. Match the file's established style; do not restructure the page.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → exit 0.
Run: `npx eslint src/app/admin/members/page.tsx` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/members/page.tsx
git commit -m "feat(admin): remove a member's avatar (moderation)"
```

---

### Task 9: Live verification + PR

**Files:** none (verification + PR).

**Prereq:** Task 2's migration has been run on the own Supabase (user-confirmed).

- [ ] **Step 1: Full build gate**

Run: `npm run build` → exit 0.
Run: `npm test` → the image-upload suite passes; no regressions.

- [ ] **Step 2: Live drive (needs a logged-in member — the owner runs these; the agent cannot enter credentials)**

Provide this checklist to the owner:
1. `/members/account` → Photo section → upload a JPG → avatar shows immediately (64px circle).
2. Reload → photo persists (proves `avatar_url` written + read).
3. Visit `/community/u/<your-handle>` **logged out** (incognito) → photo shows (proves the **anon** column grant — the highest-risk item).
4. `/community/me` → photo shows.
5. Upload a >5MB file and a `.svg` → both rejected with the message, no change.
6. Remove → reverts to the deterministic icon everywhere above.
7. Re-upload twice → the storage `member-avatars/<uid>/` folder holds exactly one object (no orphans) — check in the Supabase Storage UI.
8. As admin, `/admin/members` → Remove photo on a member → their avatar reverts to icon.

- [ ] **Step 3: Open the PR with a note line**

Draft five `Tweet:` lines per `docs/PR-TWEET.md`, ship one, put it on the `Tweet:` line of the PR body. Summarize scope (v1 = profile pages; feed deferred to Phase 2) and the manual-migration prerequisite.

```bash
git push -u origin feat/profile-photo
# gh pr create --base main --title "feat(members): profile photo uploads (v1)" --body "...Tweet: <one line>..."
```

- [ ] **Step 4: Merge gate**

Wait for green CI (`gh pr checks` — a broken workflow fails OPEN and won't show; confirm the checks are actually present and passing). Do not merge until the owner OKs. After merge, verify prod HTML (auto-deploy is unreliable).

---

## Self-Review

**Spec coverage:**
- Storage bucket + policies → Task 2. ✅
- `avatar_url` column + anon grant → Task 2 (Step 1 investigates, Step 2 grants). ✅
- Upload/remove/admin-remove actions → Task 3. ✅
- Reuse community upload constants (DRY) → Task 1. ✅
- CommunityAvatar `+src` fallback → Task 4. ✅
- Account-page uploader UI → Tasks 5–6. ✅
- Show on account + `/community/u` + `/community/me` → Tasks 6–7. ✅
- Manual admin moderation → Task 8. ✅
- Out-of-scope (feed avatars, cropper, resize, NSFW) → not planned, correct. ✅
- Verify anon grant + orphan cleanup (the two named risks) → Task 9 Step 2 items 3 & 7; cleanup implemented Task 3. ✅

**Placeholder scan:** No TBD/TODO. Tasks 1, 3–7 carry complete code. Tasks 2 & 8 contain investigate-then-write steps because both must conform to existing on-disk shapes (current anon grants; the admin page's established row pattern) that must be read at execution time — the SQL body (Task 2) and the button (Task 8) are both fully written; only the *conformance check* is deferred, which is correct, not a placeholder.

**Type consistency:** `AvatarState = {ok:true}|{error:string}` used uniformly across the three actions and consumed via `"ok" in res` in the uploader. `validateImageFile` returns `string | null`, checked as truthy everywhere. `CommunityAvatar` `src?: string | null`; callers pass `string | null`. `getProfileByUsername` gains `avatarUrl: string | null`, consumed at `u/[username]` as `profile.avatarUrl`. Consistent.
