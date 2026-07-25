# Community profile redesign — LinkedIn-style `/community/u/[username]`

**Date:** 2026-07-25
**Branch:** `feat/community-profile-redesign`
**Status:** approved for planning

## Goal

Rebuild the per-member public profile at `/community/u/[username]` from the current
minimal header + post feed into a rich, LinkedIn-style profile: cover band, overlapping
avatar, name + badge + verified tick, headline, member-since, and a tab bar
(Posts / About / Media / Network / Financial Help). Every member gets it. Own-profile
inline editing for the new fields.

Reference mockup: LinkedIn-style profile card with cover, avatar, name + verified,
headline "Web and SaaS Developer", "Member Since Jan 26, 2024", and 5 tabs.

## What is real vs. mockup decoration

The mockup shows fields with no backing system. Decisions:

| Mockup element | Decision |
|---|---|
| Cover image | **New** public column `cover_url`, own-profile upload (mirrors avatar). |
| Headline ("Web and SaaS Developer") | **New** public column `headline`, inline editable. |
| Member since (date) | Reuse existing `profiles.created_at` (already in public grant). |
| Badge pills (Top Voice / Social Fly / Innovator) | **Dropped.** No system awards these. Render the ONE existing computed `community_badge` as a single pill. |
| "150 Connections" | Reuse follower count. No "connections" concept. |
| Location ("Nagpur") | **Dropped.** Existing `location` column is private PII (DOB/WhatsApp group); showing it would be a privacy regression. Not shown, not added. |
| About tab | Reuse existing `bio` column. |
| Media tab | Image attachments from this author's own posts. |
| Network tab | Follower/following counts + links to existing `/followers` `/following` pages. |
| Financial Help tab | CTA card → existing `/support`. |

## Non-negotiable: logged-out gating preserved

The profile IS a feed filtered to one author. Today, logged-out visitors get
`listRandomFeed` preview + `SignInWall`; logged-in get `listFeed` + `FeedStream`.
This gating is the security boundary around `/community` and MUST be preserved on the
Posts tab exactly as-is. The redesign wraps the existing feed in new chrome; it does not
change who can read what.

## Schema

New migration file (SQL handed to the user to run — manual Supabase workflow, never
applied directly):

```sql
alter table public.profiles add column if not exists headline  text;
alter table public.profiles add column if not exists cover_url text;

-- Public read: mirror the existing column-level grant so anon + authenticated
-- can SELECT the new public fields (existing grant is column-scoped).
grant select (headline, cover_url) on public.profiles to anon, authenticated;
```

Writes go through the **service role** in a server action, NOT an auth-client UPDATE:
`security_hardening.sql` column-allowlists the authenticated UPDATE on `profiles` to
`(username, display_name, bio)`, so `headline` / `cover_url` writes from the auth client
are silently denied. This is the established `avatar_url` pattern
(`src/lib/members/avatar-actions.ts`). The server action authenticates the user, then
writes scoped to their own `id` via `supabaseAdmin()`.

New storage bucket `member-covers`, mirroring `member-avatars` (public bucket, per-user
folder, fresh path per upload for cache-bust). Bucket + policies created in the same
migration or handed as SQL.

## Data layer changes

`getProfileByUsername` (`src/lib/community/queries.ts`) extends its select and return
type to include `headline`, `coverUrl`, and `createdAt`:

```
select id, username, display_name, avatar_url, headline, cover_url, created_at
```

Return type adds `headline: string | null; coverUrl: string | null; createdAt: string`.
Badge and social counts unchanged (already fetched via `community_badge` RPC and
`getSocialCounts`).

Media tab needs image attachments by author. Add a query
`listAuthorMedia(userId, limit)` returning image URLs from this author's non-moderated
posts (reuse the existing media join used by the feed; filter to image type). Ponytail:
if a simple query over the existing media table covers it, no new abstraction.

## Component structure

New/changed files:

- `src/app/community/u/[username]/page.tsx` — rewritten. Reads `?tab=` search param
  (default `posts`), fetches profile + counts + tab-specific data, renders:
  `<ProfileHeader>` + `<ProfileTabs active={tab}>` + the active tab's content.
- `src/components/community/profile-header.tsx` — cover band, avatar (overlapping),
  name + `BadgeTick` + badge pill, headline, member-since, Follow button. When
  `isSelf`, renders inline edit affordances (cover camera button, avatar button,
  headline/edit pencil).
- `src/components/community/profile-tabs.tsx` — the 5-item tab bar. Server component;
  each tab is a `<Link href="?tab=...">`, active state from the current param. No client
  tab library.
- Tab content, each a small server section (rendered in `page.tsx` by a switch on `tab`):
  - **Posts** — existing feed block (FeedStream / SignInWall), lifted unchanged.
  - **About** — `bio`, `headline`, member-since. Own-profile edit for bio + headline.
  - **Media** — grid of image thumbnails from `listAuthorMedia`, each linking to its post.
  - **Network** — follower/following counts + a few avatars + links to existing
    `/followers` and `/following` pages.
  - **Financial Help** — CTA card linking to `/support`.
- `src/components/community/profile-edit.tsx` — client component with the inline edit
  forms (headline text, cover upload, bio). Calls new server actions. Own-profile only.
- `src/lib/members/profile-actions.ts` (new) — server actions `updateProfileText`
  (headline + bio) and `uploadCover` / `removeCover`, all service-role writes scoped to
  the caller's own id, revalidating `/community/u/{handle}` and `/community/me`. Mirrors
  `avatar-actions.ts` shape.

## Tab routing approach

Chosen: **`?tab=` search param, server-rendered.** No client tab framework, no nested
route segments. Each tab is a `Link`; the page reads the param and renders the matching
section server-side. Posts is the default (no param). Rationale: keeps the SSR feed +
logged-out gating trivially intact, no client state, smallest diff. Rejected: nested
route segments (`/media`, `/about` folders) — more files, duplicated header fetch per
route; client tab switcher — would fight the SSR feed and gating.

## Inline edit UX (own profile)

- Cover: a camera/upload button top-right of the cover band → file picker → `uploadCover`.
  Neutral gradient fallback when `cover_url` is null.
- Avatar: reuse the existing avatar upload control/action.
- Headline: pencil next to the headline → inline text input → `updateProfileText`.
- About/bio: edit control in the About tab → same `updateProfileText` action.
- All edit controls render only when `user?.id === profile.id`. No admin edit path in
  this scope.

## Validation / errors

- Cover upload reuses `validateImageFile` / `imageExt` (`src/lib/media/image-upload.ts`)
  — same size/type checks as avatars. Upload failure returns an error string surfaced
  inline; DB write failure returns a generic "Could not save" message.
- Text fields: trim, treat empty as `null` (clears the field). Headline length capped
  (e.g. 120 chars) client + server. No rich text.
- Unknown `?tab=` value falls back to Posts.

## Testing

- Server action unit check: `updateProfileText` rejects when unauthenticated, writes
  scoped to own id, empties to null on blank input (assert-based self-check per the repo
  convention).
- Manual/preview: own profile shows edit controls; another member's profile does not;
  logged-out profile still hits the SignInWall on Posts; each tab renders; cover
  upload + headline edit persist after revalidate.

## Ponytail cuts (deliberate)

- No client tab library — search param.
- No badge-pill system — one real computed badge.
- No "connections" concept — follower count.
- Location dropped — avoids a private-PII regression and a column.
- Network + Financial Help reuse existing routes/pages, not new subsystems.
- Cover reuses the entire avatar upload infrastructure (bucket pattern, image validation,
  service-role write, revalidate helper).

## Out of scope

- Admin editing of headline/cover/bio.
- Making location public (explicitly rejected).
- Awarding real Top Voice / Social Fly / Innovator badges.
- Any change to who can read the feed.

## Build-time verifications

- Confirm `avatar_url` already has a public column-level select grant (it reads today);
  if the new `grant select (...)` needs `avatar_url` too, include it. Do not assume.
- Confirm the media table/join name used by the feed before writing `listAuthorMedia`.
- Run `next build` and confirm exit 0 (a client importing server-only passes tsc but
  breaks the build).
