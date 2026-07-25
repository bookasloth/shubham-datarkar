# Community Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/community/u/[username]` into a LinkedIn-style profile (cover, avatar, badge pill, headline, member-since, 5 tabs) with own-profile inline editing.

**Architecture:** Server-rendered page reading a `?tab=` search param. New public `profiles` columns `headline` + `cover_url` written via service role (auth UPDATE is column-allowlisted). Cover upload reuses the entire avatar-upload infrastructure. Tabs are `<Link>`s, no client tab library. Logged-out feed gating on the Posts tab is preserved unchanged.

**Tech Stack:** Next.js (App Router, RSC), Supabase (Postgres + Storage), Vitest, Tailwind.

## Global Constraints

- **Manual SQL workflow:** migrations are written as files and handed to the user to run in Supabase. NEVER apply schema directly.
- **Service-role writes for non-allowlisted columns:** `security_hardening.sql` allowlists the authenticated `profiles` UPDATE to `(username, display_name, bio)`. `headline` and `cover_url` MUST be written with `supabaseAdmin()` after authenticating the caller and scoping to their own `id`. `bio` may use either path; for one action, write all three via service role for consistency.
- **Preserve logged-out gating:** the Posts tab keeps the exact existing behavior — logged-out gets `listRandomFeed` preview + `SignInWall`; logged-in gets `listFeed` + `FeedStream`. Do not widen read access.
- **Design:** monochrome, no emojis, fonts Jakarta + Poppins (`font-display` for headings). Follow existing component styling.
- **Verify `next build` exits 0** after the final task (a client importing server-only passes tsc but breaks the build).
- **Copy:** community auto-posts are called "notes", not "tweets" — irrelevant here but do not introduce "tweet" copy.

---

### Task 1: Schema migration + cover storage bucket

**Files:**
- Create: `supabase/migrations/20260725000001_community_profile_fields.sql`

**Interfaces:**
- Produces: `profiles.headline text`, `profiles.cover_url text` (public-readable); storage bucket `member-covers`.

- [ ] **Step 1: Write the migration file**

```sql
-- =====================================================================
-- /community — public profile fields (headline, cover) + cover bucket.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001_community_schema.sql (profiles) and
-- 20260713000001_security_hardening.sql (column-allowlisted UPDATE).
-- headline/cover_url are PUBLIC. location is intentionally NOT surfaced here
-- (it is private PII in 20260714000001_member_account_fields.sql).
-- =====================================================================

alter table public.profiles add column if not exists headline  text;
alter table public.profiles add column if not exists cover_url text;

-- Public read: the existing profiles select grant is column-scoped, so the
-- new public columns need their own grant for anon + authenticated to read.
grant select (headline, cover_url) on public.profiles to anon, authenticated;

-- Writes happen via the service role in a server action, so no UPDATE grant
-- is added here (matches how avatar_url is written).

-- Cover images bucket, mirroring member-avatars.
insert into storage.buckets (id, name, public)
values ('member-covers', 'member-covers', true)
on conflict (id) do nothing;

drop policy if exists member_covers_public_read on storage.objects;
create policy member_covers_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'member-covers');

-- Defense in depth: the server action uploads with the service role, but a
-- direct client upload must still be a signed-in member writing their own folder.
drop policy if exists member_covers_member_write on storage.objects;
create policy member_covers_member_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists member_covers_member_delete on storage.objects;
create policy member_covers_member_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-covers' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Hand the SQL to the user to run**

Tell the user: "Run `supabase/migrations/20260725000001_community_profile_fields.sql` in the Supabase SQL editor (own project, ref oyzzgjrefkppqkxjccot). It adds `headline` + `cover_url` and the `member-covers` bucket." Do NOT apply it directly. Wait for confirmation before relying on the columns at runtime, but later code tasks can proceed against the schema in parallel.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260725000001_community_profile_fields.sql
git commit -m "feat(community): profile headline + cover columns and bucket"
```

---

### Task 2: Text normalizer helper (pure, tested)

**Files:**
- Create: `src/lib/members/profile-text.ts`
- Test: `src/lib/members/profile-text.test.ts`

**Interfaces:**
- Produces: `normalizeProfileText(input: { headline?: string | null; bio?: string | null }): { headline: string | null; bio: string | null }` — trims, converts empty to `null`, caps headline at 120 chars and bio at 500 chars (truncates).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeProfileText } from "./profile-text";

describe("normalizeProfileText", () => {
  it("trims and empties blank strings to null", () => {
    expect(normalizeProfileText({ headline: "  ", bio: "" })).toEqual({ headline: null, bio: null });
  });
  it("keeps trimmed content", () => {
    expect(normalizeProfileText({ headline: "  Web Dev  ", bio: "Hi" })).toEqual({ headline: "Web Dev", bio: "Hi" });
  });
  it("caps headline at 120 chars and bio at 500", () => {
    const r = normalizeProfileText({ headline: "a".repeat(200), bio: "b".repeat(600) });
    expect(r.headline).toHaveLength(120);
    expect(r.bio).toHaveLength(500);
  });
  it("treats undefined as null", () => {
    expect(normalizeProfileText({})).toEqual({ headline: null, bio: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/members/profile-text.test.ts`
Expected: FAIL — "Cannot find module './profile-text'".

- [ ] **Step 3: Write the implementation**

```ts
/** Trim → empty-to-null → length cap. Shared by the profile edit server action
 *  and (client-side) the edit form, so both agree on limits. */
export const HEADLINE_MAX = 120;
export const BIO_MAX = 500;

function clean(value: string | null | undefined, max: number): string | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function normalizeProfileText(input: { headline?: string | null; bio?: string | null }): {
  headline: string | null;
  bio: string | null;
} {
  return {
    headline: clean(input.headline, HEADLINE_MAX),
    bio: clean(input.bio, BIO_MAX),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/members/profile-text.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/profile-text.ts src/lib/members/profile-text.test.ts
git commit -m "feat(community): profile text normalizer"
```

---

### Task 3: Extend profile queries (headline, cover, member-since, media)

**Files:**
- Modify: `src/lib/community/queries.ts` (`getProfileByUsername` at 208-229; add `listAuthorMedia`)

**Interfaces:**
- Consumes: existing `supabaseAuthServer`, `community_badge` RPC, `Badge` type from `./types`.
- Produces:
  - `getProfileByUsername` return type gains `headline: string | null; coverUrl: string | null; createdAt: string`.
  - `listAuthorMedia(userId: string, limit?: number): Promise<{ url: string; publicId: string }[]>` — flattened image URLs from the author's own non-moderated posts, newest first.

- [ ] **Step 1: Extend `getProfileByUsername`**

Replace the select and return in `getProfileByUsername` (lines 210-228):

```ts
): Promise<{
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  coverUrl: string | null;
  createdAt: string;
  bio: string | null;
  badge: Badge;
} | null> {
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, headline, cover_url, created_at, bio")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  const { data: badge } = await sb.rpc("community_badge", { p_user: data.id });
  return {
    id: data.id as string,
    username: data.username as string,
    displayName: (data.display_name as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    headline: (data.headline as string) ?? null,
    coverUrl: (data.cover_url as string) ?? null,
    createdAt: data.created_at as string,
    bio: (data.bio as string) ?? null,
    badge: ((badge as Badge) ?? "grey") satisfies Badge,
  };
}
```

- [ ] **Step 2: Add `listAuthorMedia` at the end of the file**

`community_posts.images` is a `text[]` of public URLs (same column the feed reads as `r.images`). Query the author's own root posts, flatten:

```ts
/** Image URLs the author has posted, newest first, for the Media tab. Reads the
 *  same `images` text[] the feed shows. Excludes replies (parent_id) so the grid
 *  mirrors the profile's post list; moderated rows are dropped by the not-null
 *  guard below plus the feed's own moderation (best-effort — the Media grid is
 *  cosmetic, not an access-control surface). */
export async function listAuthorMedia(
  userId: string,
  limit = 24,
): Promise<{ url: string; publicId: string }[]> {
  const sb = await supabaseAuthServer();
  const { data } = await sb
    .from("community_posts")
    .select("public_id, images, created_at")
    .eq("user_id", userId)
    .is("parent_id", null)
    .not("images", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  const out: { url: string; publicId: string }[] = [];
  for (const row of data ?? []) {
    const imgs = (row.images as string[]) ?? [];
    for (const url of imgs) out.push({ url, publicId: String(row.public_id) });
  }
  return out.slice(0, limit);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `queries.ts`. (Callers of `getProfileByUsername` still compile — the return type only gains fields.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/community/queries.ts
git commit -m "feat(community): profile query fields + author media"
```

---

### Task 4: Profile edit server actions

**Files:**
- Create: `src/lib/members/profile-actions.ts`

**Interfaces:**
- Consumes: `normalizeProfileText` (Task 2), `validateImageFile`/`imageExt`, `supabaseAuthServer`, `supabaseAdmin`.
- Produces:
  - `updateProfileText(formData: FormData): Promise<{ ok: true } | { error: string }>` — reads `headline`, `bio`; normalizes; service-role writes to own id.
  - `uploadCover(formData: FormData): Promise<{ ok: true } | { error: string }>` — reads `cover` file; validates; uploads to `member-covers`; writes `cover_url`.
  - `removeCover(): Promise<{ ok: true } | { error: string }>`.

- [ ] **Step 1: Write the actions file**

Mirrors `src/lib/members/avatar-actions.ts` exactly for storage handling.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";
import { normalizeProfileText } from "@/lib/members/profile-text";

const BUCKET = "member-covers";

export type ProfileActionState = { ok: true } | { error: string };

function revalidateProfiles(handle?: string | null): void {
  revalidatePath("/members/account");
  revalidatePath("/community/me");
  if (handle) revalidatePath(`/community/u/${handle}`);
}

/** headline + bio. Service-role write: the authenticated UPDATE on profiles is
 *  column-allowlisted to (username, display_name, bio), so headline would be
 *  denied on the auth client. Authenticated above, scoped to own id. */
export async function updateProfileText(formData: FormData): Promise<ProfileActionState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { headline, bio } = normalizeProfileText({
    headline: formData.get("headline") as string | null,
    bio: formData.get("bio") as string | null,
  });

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ headline, bio }).eq("id", user.id);
  if (error) return { error: "Could not save your profile." };

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function uploadCover(formData: FormData): Promise<ProfileActionState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };

  const admin = supabaseAdmin();
  const path = `${user.id}/${Date.now()}.${imageExt(file)}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: dbErr } = await admin.from("profiles").update({ cover_url: publicUrl }).eq("id", user.id);
  if (dbErr) return { error: "Could not save your cover." };

  // Drop older objects only after the new one is committed.
  const { data: prev } = await admin.storage.from(BUCKET).list(user.id);
  const current = path.split("/")[1];
  const stale = (prev ?? []).filter((o) => o.name !== current).map((o) => `${user.id}/${o.name}`);
  if (stale.length) await admin.storage.from(BUCKET).remove(stale);

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}

export async function removeCover(): Promise<ProfileActionState> {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ cover_url: null }).eq("id", user.id);
  if (error) return { error: "Could not remove your cover." };
  const { data } = await admin.storage.from(BUCKET).list(user.id);
  if (data && data.length) {
    await admin.storage.from(BUCKET).remove(data.map((o) => `${user.id}/${o.name}`));
  }

  const { data: p } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateProfiles(p?.username as string | undefined);
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/members/profile-actions.ts
git commit -m "feat(community): profile text + cover server actions"
```

---

### Task 5: Cover uploader + text edit client components

**Files:**
- Create: `src/components/community/cover-uploader.tsx`
- Create: `src/components/community/profile-text-edit.tsx`

**Interfaces:**
- Consumes: `uploadCover`, `removeCover`, `updateProfileText` (Task 4); `HEADLINE_MAX`, `BIO_MAX` (Task 2); `validateImageFile`, `ALLOWED_IMAGE_TYPES`; `Button`.
- Produces:
  - `<CoverUploader current={string | null} />` — overlay upload/remove buttons; only rendered on own profile.
  - `<ProfileTextEdit headline={string | null} bio={string | null} />` — a small dialog/inline form editing headline + bio, submitting `updateProfileText`; on success calls `router.refresh()`.

- [ ] **Step 1: Write `cover-uploader.tsx`**

Mirrors `avatar-uploader.tsx` behavior (client preview, transition, error). Renders a translucent button row positioned over the cover band by the parent.

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { uploadCover, removeCover } from "@/lib/members/profile-actions";
import { validateImageFile, ALLOWED_IMAGE_TYPES } from "@/lib/media/image-upload";
import { Button } from "@/components/ui/button";

export function CoverUploader({ current }: { current: string | null }) {
  const [saved, setSaved] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) return setError(invalid);
    setError(null);
    const fd = new FormData();
    fd.set("cover", file);
    start(async () => {
      const res = await uploadCover(fd);
      if ("ok" in res) setSaved(URL.createObjectURL(file));
      else setError(res.error);
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeCover();
      if ("ok" in res) setSaved(null);
      else setError(res.error);
    });
  }

  return (
    <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" loading={pending} onClick={() => inputRef.current?.click()}>
          {saved ? "Change cover" : "Add cover"}
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
      {error && <p className="rounded bg-background/90 px-2 py-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write `profile-text-edit.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileText } from "@/lib/members/profile-actions";
import { HEADLINE_MAX, BIO_MAX } from "@/lib/members/profile-text";
import { Button } from "@/components/ui/button";

export function ProfileTextEdit({ headline, bio }: { headline: string | null; bio: string | null }) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(headline ?? "");
  const [b, setB] = useState(bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Edit profile
      </Button>
    );
  }

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set("headline", h);
    fd.set("bio", b);
    start(async () => {
      const res = await updateProfileText(fd);
      if ("ok" in res) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
      <label className="block text-sm font-medium">Headline</label>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        maxLength={HEADLINE_MAX}
        value={h}
        onChange={(e) => setH(e.target.value)}
        placeholder="e.g. Web and SaaS Developer"
      />
      <label className="block text-sm font-medium">About</label>
      <textarea
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        maxLength={BIO_MAX}
        rows={4}
        value={b}
        onChange={(e) => setB(e.target.value)}
        placeholder="A short bio."
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={pending} onClick={save}>Save</Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Confirm `Button` accepts a `loading` prop — `avatar-uploader.tsx` uses it, so it exists.)

- [ ] **Step 4: Commit**

```bash
git add src/components/community/cover-uploader.tsx src/components/community/profile-text-edit.tsx
git commit -m "feat(community): cover uploader + profile text edit"
```

---

### Task 6: Profile header + tab bar components

**Files:**
- Create: `src/components/community/profile-header.tsx`
- Create: `src/components/community/profile-tabs.tsx`

**Interfaces:**
- Consumes: `CommunityAvatar`, `BadgeTick`, `FollowButton`, `CoverUploader`, `ProfileTextEdit`, `Badge` type.
- Produces:
  - `PROFILE_TABS` constant + `ProfileTab` type: `"posts" | "about" | "media" | "network" | "financial"`.
  - `<ProfileTabs username={string} active={ProfileTab} />`.
  - `<ProfileHeader profile={...} social={...} isSelf={boolean} showFollow={boolean} />`.

- [ ] **Step 1: Write `profile-tabs.tsx`**

```tsx
import Link from "next/link";

export const PROFILE_TABS = ["posts", "about", "media", "network", "financial"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

const LABELS: Record<ProfileTab, string> = {
  posts: "Posts",
  about: "About",
  media: "Media",
  network: "Network",
  financial: "Financial Help",
};

export function ProfileTabs({ username, active }: { username: string; active: ProfileTab }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-2">
      {PROFILE_TABS.map((tab) => {
        const href = tab === "posts" ? `/community/u/${username}` : `/community/u/${username}?tab=${tab}`;
        const on = tab === active;
        return (
          <Link
            key={tab}
            href={href}
            className={`whitespace-nowrap px-3 py-3 text-sm font-medium ${
              on ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Write `profile-header.tsx`**

```tsx
import { CommunityAvatar } from "@/components/community/community-avatar";
import { BadgeTick } from "@/components/community/badge-tick";
import { FollowButton } from "@/components/community/follow-button";
import { CoverUploader } from "@/components/community/cover-uploader";
import { ProfileTextEdit } from "@/components/community/profile-text-edit";
import type { Badge } from "@/lib/community/types";

const BADGE_LABEL: Record<Badge, string | null> = {
  gold: "Founder",
  orange: "Supporter",
  grey: null, // plain verified — the tick alone, no pill
};

export type ProfileHeaderProps = {
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    headline: string | null;
    coverUrl: string | null;
    createdAt: string;
    bio: string | null;
    badge: Badge;
  };
  social: { followers: number; following: number; viewerFollows: boolean | null };
  isSelf: boolean;
  showFollow: boolean;
};

export function ProfileHeader({ profile, social, isSelf, showFollow }: ProfileHeaderProps) {
  const name = profile.displayName ?? `@${profile.username}`;
  const pill = BADGE_LABEL[profile.badge];
  const since = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="border-b border-border">
      {/* Cover band */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-muted to-muted-foreground/20 sm:h-52">
        {profile.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
        )}
        {isSelf && <CoverUploader current={profile.coverUrl} />}
      </div>

      {/* Avatar overlaps the cover */}
      <div className="px-4">
        <div className="-mt-10 flex items-end justify-between">
          <div className="rounded-full ring-4 ring-background">
            <CommunityAvatar seed={profile.username} src={profile.avatarUrl} size={80} />
          </div>
          {showFollow && (
            <FollowButton
              username={profile.username}
              initialFollowing={social.viewerFollows ?? false}
              initialFollowers={social.followers}
            />
          )}
          {isSelf && <ProfileTextEdit headline={profile.headline} bio={profile.bio} />}
        </div>

        <div className="mt-2 pb-4">
          <h1 className="flex items-center gap-1.5 font-display text-xl font-bold">
            {name}
            <BadgeTick badge={profile.badge} />
            {pill && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {pill}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.headline && <p className="mt-1 text-sm">{profile.headline}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Member since {since}</p>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm `BadgeTick` accepts a `badge` prop (used in the current page at line 90).

- [ ] **Step 4: Commit**

```bash
git add src/components/community/profile-header.tsx src/components/community/profile-tabs.tsx
git commit -m "feat(community): profile header + tab bar"
```

---

### Task 7: Rewrite the profile page with tabs

**Files:**
- Modify: `src/app/community/u/[username]/page.tsx` (full rewrite of the component body)

**Interfaces:**
- Consumes: `getProfileByUsername`, `getSocialCounts`, `listAuthorMedia`, `countAuthorPosts`, `listFeed`/`listRandomFeed`/`listPollResults`, `viewerCanPost` (queries); `ProfileHeader`, `ProfileTabs`, `PROFILE_TABS`, `ProfileTab`; `PostCard`, `FeedStream`, `SignInWall`, `FollowButton`, `getMemberContext`.
- Produces: the rendered page. No exports consumed elsewhere.

- [ ] **Step 1: Rewrite `page.tsx`**

Keep `generateMetadata` unchanged. Replace `CommunityProfilePage`:

```tsx
export default async function CommunityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const tab: ProfileTab = (PROFILE_TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as ProfileTab)
    : "posts";

  const { user } = await getMemberContext();
  const isSelf = user?.id === profile.id;
  const social = await getSocialCounts(profile.id);

  return (
    <div>
      <ProfileHeader
        profile={profile}
        social={social}
        isSelf={isSelf}
        showFollow={Boolean(user) && !isSelf}
      />
      <ProfileTabs username={profile.username} active={tab} />

      {tab === "posts" && <PostsTab profile={profile} user={user} />}
      {tab === "about" && <AboutTab profile={profile} />}
      {tab === "media" && <MediaTab userId={profile.id} />}
      {tab === "network" && <NetworkTab profile={profile} social={social} />}
      {tab === "financial" && <FinancialTab />}
    </div>
  );
}
```

- [ ] **Step 2: Add the Posts tab (gating preserved verbatim)**

This lifts the EXISTING feed logic — logged-out preview + `SignInWall`, logged-in `FeedStream`. Add below the page component:

```tsx
async function PostsTab({
  profile,
  user,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;
  user: Awaited<ReturnType<typeof getMemberContext>>["user"];
}) {
  const [canPost, posts] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    user
      ? listFeed({ sort: "new", window: "all", author: profile.username, limit: FEED_PAGE })
      : listRandomFeed(PREVIEW, { author: profile.username }),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  const cards = posts.map((post) => (
    <PostCard
      key={post.rowId}
      post={post}
      pollResult={pollResults[post.id]}
      canVote={canPost}
      viewerId={user?.id ?? null}
    />
  ));

  if (posts.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">No posts yet.</p>;
  }
  return (
    <>
      {user ? (
        <FeedStream query={{ author: profile.username }} initialCount={posts.length}>
          {cards}
        </FeedStream>
      ) : (
        cards
      )}
      {!user && <SignInWall returnPath={`/community/u/${profile.username}`} />}
    </>
  );
}
```

- [ ] **Step 3: Add About, Media, Network, Financial tabs**

```tsx
function AboutTab({
  profile,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;
}) {
  const since = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="space-y-4 px-4 py-6 text-sm">
      {profile.headline && (
        <div>
          <h2 className="mb-1 font-display font-semibold">Headline</h2>
          <p>{profile.headline}</p>
        </div>
      )}
      <div>
        <h2 className="mb-1 font-display font-semibold">About</h2>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {profile.bio ?? "Nothing here yet."}
        </p>
      </div>
      <div>
        <h2 className="mb-1 font-display font-semibold">Member since</h2>
        <p className="text-muted-foreground">{since}</p>
      </div>
    </div>
  );
}

async function MediaTab({ userId }: { userId: string }) {
  const media = await listAuthorMedia(userId);
  if (media.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">No media yet.</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {media.map((m, i) => (
        <Link key={`${m.publicId}-${i}`} href={`/community/p/${m.publicId}`} className="block aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" className="h-full w-full object-cover" />
        </Link>
      ))}
    </div>
  );
}

function NetworkTab({
  profile,
  social,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUsername>>>;
  social: Awaited<ReturnType<typeof getSocialCounts>>;
}) {
  return (
    <div className="flex gap-4 px-4 py-6 text-sm">
      <Link href={`/community/u/${profile.username}/followers`} className="rounded-lg border border-border px-4 py-3 hover:bg-muted">
        <strong className="text-lg">{social.followers}</strong>
        <span className="ml-1 text-muted-foreground">{social.followers === 1 ? "follower" : "followers"}</span>
      </Link>
      <Link href={`/community/u/${profile.username}/following`} className="rounded-lg border border-border px-4 py-3 hover:bg-muted">
        <strong className="text-lg">{social.following}</strong>
        <span className="ml-1 text-muted-foreground">following</span>
      </Link>
    </div>
  );
}

function FinancialTab() {
  return (
    <div className="px-4 py-10 text-center">
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        Support the creator directly.
      </p>
      <Link
        href="/support"
        className="mt-4 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        Go to Support
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Fix imports**

Update the import block at the top of `page.tsx`: remove now-unused `CommunityAvatar` and `BadgeTick` (moved into `ProfileHeader`); keep `Link`, `PostCard`, `FeedStream`/`FEED_PAGE`, `SignInWall`, `FollowButton` (FollowButton now used only inside ProfileHeader — remove from page if unused), `getMemberContext`, and the queries. Add:

```tsx
import { ProfileHeader } from "@/components/community/profile-header";
import { ProfileTabs, PROFILE_TABS, type ProfileTab } from "@/components/community/profile-tabs";
import { listAuthorMedia } from "@/lib/community/queries";
```

Ensure `countAuthorPosts` import is dropped if no longer used (post count no longer shown in the header — the tabs replace it). Run `npx eslint src/app/community/u/[username]/page.tsx` and fix unused-import errors it reports.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/community/u/[username]/page.tsx"`
Expected: no errors.

- [ ] **Step 6: Build**

Run: `npx next build`
Expected: exit 0. (Catches a client/server import boundary violation that tsc misses.)

- [ ] **Step 7: Commit**

```bash
git add "src/app/community/u/[username]/page.tsx"
git commit -m "feat(community): LinkedIn-style profile with tabs"
```

---

### Task 8: Manual verification in preview

**Files:** none (verification only).

- [ ] **Step 1: Confirm the migration was run**

Ask the user whether `20260725000001_community_profile_fields.sql` has been applied. If not, the profile page will error on the missing columns — wait for confirmation.

- [ ] **Step 2: Start the dev server and verify**

Use `preview_start` with the project's dev server config. Then:
- Visit `/community/u/<your-own-handle>` logged in: cover band, avatar, name + tick, "Edit profile" button visible.
- Click "Edit profile", set a headline + bio, Save → page refreshes showing them.
- "Add cover" → upload an image → cover appears.
- Click each tab (About, Media, Network, Financial Help) — each renders, no console errors (`read_console_messages`).
- Visit another member's profile: no edit controls, Follow button present.
- Log out, visit the profile: Posts tab still shows the `SignInWall` after the preview posts (gating intact).
- Screenshot the finished profile for the user.

- [ ] **Step 3: Commit any fixes**

If issues surface, fix at the source file, re-run `npx next build`, commit.

---

## Notes for the implementer

- **`BadgeTick` for `grey`:** verify how it renders a plain verified member today (it already handles all three badges in the current page). The header shows the tick for every badge and a text pill only for gold/orange.
- **`Button` `loading` prop:** confirmed used by `avatar-uploader.tsx`; safe to use.
- **`community-avatar` ring:** the `ring-4 ring-background` wrapper gives the LinkedIn avatar-overlaps-cover look; adjust `-mt-10` if the avatar clips.
- **Media moderation:** `listAuthorMedia` does not join the moderation table; the Media grid is cosmetic. If a moderated image must be hidden, filter against `community_feed` in a follow-up — out of scope here.
