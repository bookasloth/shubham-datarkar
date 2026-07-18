# Profile Photo — v1 design

**Date:** 2026-07-18
**Status:** Approved, pending implementation plan
**Related:** Follows username-edit (#233). Companion feature: "let members update username + profile photo."

## Goal

Let a signed-in member upload a profile photo, replacing the deterministic
icon avatar. v1 renders the photo on **profile surfaces** (account page +
public profile pages). The high-traffic feed keeps deterministic icons until a
Phase 2 follow-up. Admins can remove any photo (manual moderation).

## Non-goals (explicitly out of scope)

- **Feed / reply / leaderboard avatars.** These render from `community_*` RPC
  rows; showing photos there needs RPC return-signature changes (drop+recreate)
  plus `mapRow` / `FeedPost` / component threading. Deferred to Phase 2.
- **Cropper UI.** Upload as-is; a circular `object-cover` handles display.
- **Auto server-side resize.** Not in v1.
- **NSFW / auto moderation.** Manual admin-remove only. Add a scan if volume
  grows.
- **Rename cooldown / username work.** Shipped separately (#233).

## Decisions (locked in brainstorming)

| Fork | Decision | Why |
|---|---|---|
| Crop/processing | Upload as-is, CSS `object-cover` circle | Zero new code/deps; fine at avatar sizes |
| Moderation | Manual admin-remove | Small userbase; reactive is enough |
| v1 reach | Profile pages first, feed as Phase 2 | Feed is the RPC-signature-heavy part; isolate that risk |

## Reuse (this feature is small because these already exist)

- **Storage pattern** — `community-media` bucket + policies
  (`supabase/migrations/20260710000004_community_media.sql`,
  `20260713000002_storage_upload_hardening.sql`): public read, owner-folder
  write, admin delete, MIME allowlist, no svg/html.
- **Upload code** — `src/lib/community/actions.ts`: `MAX_BYTES = 5 * 1024 *
  1024`, `ALLOWED_IMAGE_TYPES = {image/jpeg, image/png, image/webp, image/gif,
  image/avif}`, service-role `admin.storage.from(bucket).upload(...)`, stores
  full public URLs.
- **CSP** — `img-src` already allows `https://*.supabase.co`
  (`next.config.ts:54`). No change.
- **next/image** — `remotePatterns` already covers
  `*.supabase.co/storage/v1/object/public/**` (`next.config.ts:11`). No change.

## Architecture

### 1. Storage — bucket `member-avatars`

Dedicated **public** bucket (not a `community-media` prefix) for a clean,
separate lifecycle and RLS. Policies mirror `community-media`:

- **public read** — `select` to `anon, authenticated` where `bucket_id =
  'member-avatars'`.
- **owner-folder write (defense-in-depth)** — `insert` to `authenticated` with
  check: own `{auth.uid()}/` folder + extension in
  `('jpg','jpeg','png','webp','gif','avif')`. Real uploads use the service role
  (bypasses RLS); this guards any future direct client upload.
- **admin delete** — `delete` to `authenticated` where `public.is_admin()`.

**Object path:** `{uid}/{stamp}.{ext}` where `stamp = Date.now()`. A fresh path
per upload is a free cache-bust (a stable path would serve a stale CDN copy
after replacement). The action deletes the prior object(s) under `{uid}/`
before/after writing the new one, so no orphans accumulate.

### 2. Database (manual SQL — hand the user the migration to run)

```sql
alter table public.profiles add column if not exists avatar_url text;
```

**Critical — column SELECT grant.** `20260714000001_member_account_fields.sql`
revoked broad SELECT and re-granted a *named column list* to `authenticated`.
`avatar_url` must be added to the readable set, for **both** the roles that
render profiles:

- `authenticated` — account page, logged-in profile views.
- `anon` — public profile pages (`/community/u/[username]`) read via the anon
  client.

If this grant is missed, `avatar_url` silently reads as `null` and no photo
ever appears. **Verify the anon role's actual current column grants** during
implementation (the account_fields migration only re-scoped `authenticated`;
confirm what `anon` is granted before writing the grant statement).

Plus the bucket + 3 storage policies above.

### 3. Server actions — `src/lib/members/avatar-actions.ts`

Mirror `src/lib/community/actions.ts` validation exactly (reuse/import the
`MAX_BYTES` + `ALLOWED_IMAGE_TYPES` constants if exportable; otherwise
duplicate the same values).

- `uploadAvatar(formData): Promise<{ok: true} | {error: string}>`
  1. Resolve auth user; reject if none.
  2. Read `file`; reject if `size > MAX_BYTES` or `type ∉ ALLOWED_IMAGE_TYPES`.
  3. Service-role upload to `member-avatars/{uid}/{Date.now()}.{ext}`.
  4. Delete any prior object(s) under `{uid}/` (list + remove).
  5. `update profiles set avatar_url = <public url> where id = uid`.
  6. `revalidatePath` account page + the member's profile paths.

- `removeAvatar(): Promise<{ok: true} | {error: string}>` — owner clears own:
  delete `{uid}/` objects, set `avatar_url = null`, revalidate.

- `removeAvatarAsAdmin(userId): ...` — guarded by `is_admin()` (server-side
  check, not just RLS): same delete + null for the target. For moderation.

Trust boundary: the server always re-validates type/size even though the client
pre-checks.

### 4. Avatar component — extend `CommunityAvatar`

`src/components/community/community-avatar.tsx`:

```
CommunityAvatar({ seed, src?, size = 40 })
  → src ? <img src={src} .../> : <deterministic icon from seed>
```

`src` is **optional** → every existing caller (feed, replies, etc.) stays on
the icon path with zero changes. Profile surfaces pass `src={avatarUrl}`.
Custom `<img>` keeps `object-cover` + rounded-full so any aspect ratio crops to
a circle.

### 5. UI — `AvatarUploader` client component

New "Photo" section on `/members/account` (`src/app/members/account/page.tsx`),
near the Username section from #233:

- Renders current avatar (custom `src` if set, else icon fallback).
- `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif">`
  → local `URL.createObjectURL` preview → **Upload** button calls
  `uploadAvatar`.
- **Remove** button (when a custom photo is set) calls `removeAvatar`.
- `useTransition` for pending; inline error text; client-side size/type
  precheck for fast feedback (server still authoritative).

### 6. Render on profile surfaces (v1 reach)

Add `avatar_url` to the profile fetch and pass to the avatar as `src` in:

- `src/app/members/account/page.tsx` (already fetches the profile row).
- `src/app/community/u/[username]/page.tsx` — via
  `getProfileByUsername` (`src/lib/community/queries.ts`), add `avatar_url` to
  its `.select(...)` and returned shape.
- `src/app/community/me/page.tsx`.

## Data flow

```
account page: <input file> → AvatarUploader → uploadAvatar (server action)
  → validate → admin.storage.upload(member-avatars/{uid}/{stamp}.ext)
  → delete old {uid}/* → update profiles.avatar_url → revalidate
  → CommunityAvatar(src=avatar_url) renders <img> on account + profile pages
fallback: avatar_url null → CommunityAvatar renders deterministic icon (unchanged)
admin: /admin/members → removeAvatarAsAdmin(userId) → is_admin() gate → delete + null
```

## Error handling

- Oversize / wrong MIME → `{error}`, no upload, no DB write.
- Storage upload failure → `{error}`, DB unchanged (update only after successful
  upload).
- Old-object delete failure → non-fatal; log, don't block the new avatar (worst
  case = one orphan; a later re-upload cleans it). `// ponytail:` note this.
- Missing anon grant → photo reads null (caught in verify, not runtime error).

## Testing / verification

Runtime (needs a logged-in member — owner drives):
1. Upload jpg/png/webp/gif → appears on account page + `/community/u/{handle}`,
   circular `object-cover`.
2. Oversize (>5MB) and wrong type (svg, pdf) → rejected with the message, no
   write.
3. Remove → reverts to deterministic icon.
4. Re-upload → previous storage object gone (no orphan); new photo shows
   immediately (no stale cache — new path).
5. **Logged-out** load of `/community/u/{handle}` shows the photo (proves the
   **anon** column grant).
6. Admin removes another user's avatar → reverts to their icon.

Static: `tsc` + `eslint` clean on changed files. `next build` exit 0 (a client
component importing `server-only` passes `tsc` but breaks the build — trust the
build exit).

## PR / deploy notes

- Two PRs: **v1** (this spec) then **Phase 2** (feed avatars).
- Migration is **manual SQL** — write the file, hand the user the SQL to run;
  don't apply directly.
- feat scope, non-noise → the merged PR auto-posts a **note** to `/community`;
  needs a `Tweet:` line per `docs/PR-TWEET.md`.
- Don't merge until owner OK; verify prod after merge (auto-deploy unreliable).

## Risk register

| Risk | Mitigation |
|---|---|
| anon column grant missed → photo always null | Explicit verify step 5; check anon's current grants before writing SQL |
| Orphaned storage objects on re-upload | Delete `{uid}/*` before/after write; non-fatal on failure |
| Stored-XSS via SVG in public bucket | MIME allowlist (raster only) both in action and RLS extension check |
| Someone uploads offensive image | Admin remove (`removeAvatarAsAdmin` + admin-delete RLS) |
| Client imports server-only, breaks build | Actions file is server-only; uploader is `"use client"` and calls actions — verify `next build` exit |
