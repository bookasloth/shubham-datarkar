# Community — Plan 6: Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the loop — members report posts and delete their own; the admin works a reports queue and can hide (silently or with notice), demote, delete, and ban. Plus the 2 ad slots become admin-editable. This is the final phase of `/community`.

**Architecture:** Most moderation needs no new privilege plumbing — Plan 1's RLS already lets an admin update/delete `community_posts` and read `community_reports`, and lets any authenticated user insert a report or delete their own post. The one exception is **banning**: `profiles` is self-write only, so `community_ban_user` is a `security definer`, `is_admin()`-gated RPC. A second RPC serves the reports queue as one joined read. Admin actions follow the codebase's `requireAdmin()` + `supabaseAuthServer()` convention.

**Tech Stack:** Next.js 16.2.9 server actions, Supabase RLS + security-definer RPCs, vitest.

## Global Constraints

- **Target project:** OWN Supabase, ref `oyzzgjrefkppqkxjccot`. NEVER the BAS project.
- **Manual SQL:** `20260710000007_community_moderation.sql` applied MANUALLY by the user.
- **Admin gate is defense-in-depth:** `requireAdmin()` in the layout AND in every admin action, plus `is_admin()` inside the RPCs and RLS policies. Never rely on the UI hiding a button.
- **Viewer identity is `auth.uid()`**, never a parameter.
- **Ban writes go through the RPC.** Do not add a `profiles` RLS policy letting admins update arbitrary rows — the RPC is the single, auditable entry point.
- **`hidden_notified` records intent only.** Sending the actual email is out of scope; the flag says whether the user was meant to be told. Say so in code, don't imply mail was sent.
- **Style:** monochrome, no emoji.
- **No new dependencies.**

---

### Task 1: Moderation migration

**Files:**
- Create: `supabase/migrations/20260710000007_community_moderation.sql`

**Interfaces:**
- `community_ban_user(p_user uuid, p_banned boolean, p_reason text default null)` → void. Admin-gated.
- `community_reports_queue(p_limit int default 50, p_offset int default 0)` → the open-reports join. Admin-gated.
- **Schema fix:** a unique index on `community_ads(slot)`. Plan 1 constrained `slot in (1,2)` but never made it unique, so an upsert-by-slot would insert duplicates and `listAds` would silently render whichever row sorted first.

```sql
-- =====================================================================
-- /community — moderation: ban RPC + reports queue + ads slot uniqueness.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001.
-- =====================================================================

-- One ad row per slot. Without this an upsert-by-slot duplicates rows.
create unique index if not exists community_ads_slot_key on public.community_ads (slot);

-- profiles is self-write only, so banning needs an admin-gated definer RPC.
create or replace function public.community_ban_user(
  p_user   uuid,
  p_banned boolean,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  update public.profiles
     set banned = p_banned,
         banned_reason = case when p_banned then p_reason else null end
   where id = p_user;
end $$;

revoke execute on function public.community_ban_user(uuid, boolean, text) from anon;
grant execute on function public.community_ban_user(uuid, boolean, text) to authenticated;

-- Open reports, joined to the post and the two handles, newest first.
create or replace function public.community_reports_queue(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  report_id uuid, post_id uuid, reason text, created_at timestamptz,
  post_body text, post_hidden boolean, post_demoted boolean,
  author_id uuid, author_username text, author_banned boolean,
  reporter_username text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.post_id, r.reason, r.created_at,
         p.body, p.hidden, p.demoted,
         p.user_id, author.username, author.banned,
         reporter.username
  from public.community_reports r
  join public.community_posts p on p.id = r.post_id
  join public.profiles author   on author.id = p.user_id
  join public.profiles reporter on reporter.id = r.reporter_id
  where not r.resolved and public.is_admin()
  order by r.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

revoke execute on function public.community_reports_queue(int, int) from anon;
grant execute on function public.community_reports_queue(int, int) to authenticated;
```

Note the `and public.is_admin()` inside the `where`: a `security definer` SQL function cannot `raise`, so the gate is a predicate — a non-admin gets zero rows rather than an error.

- [ ] Write it. Commit. Hand to the user for manual apply.

---

### Task 2: Member actions — report + delete own post

**Files:**
- Modify: `src/lib/community/engage-actions.ts`

**Interfaces:**
```ts
export async function reportPost(postId: string, reason: string): Promise<EngageResult>;
export async function deleteOwnPost(postId: string): Promise<EngageResult>;
```
- `reportPost`: any signed-in user (does **not** require `community_can_post` — a banned user may still report). Insert with `reporter_id = auth.uid()`; RLS enforces that. Reason trimmed, ≤ 300 chars, optional.
- `deleteOwnPost`: `delete().eq("id", postId).eq("user_id", user.id)` — belt and braces alongside the RLS delete policy. Cascades remove replies, votes, bookmarks.

- [ ] Write it. `tsc` clean. Commit.

---

### Task 3: Post menu (report / delete)

**Files:**
- Create: `src/components/community/post-menu.tsx`
- Modify: `src/components/community/post-card.tsx` (accept `viewerId`)
- Modify: the four pages to pass `viewerId`

**Interfaces:**
- `<PostMenu postId isOwner />` — client, a `DropdownMenu` behind a `MoreHorizontal` trigger. "Report" opens a small prompt for an optional reason; "Delete" only when `isOwner`.
- `PostCard` gains `viewerId?: string | null` and renders the menu only when signed in.

- [ ] Write it. `tsc` + `eslint` clean. Commit.

---

### Task 4: Admin actions

**Files:**
- Create: `src/lib/community/admin-actions.ts`

**Interfaces:**
```ts
export async function resolveReport(reportId: string): Promise<void>;
export async function setPostHidden(postId: string, hidden: boolean, reason: string, notify: boolean): Promise<void>;
export async function setPostDemoted(postId: string, demoted: boolean): Promise<void>;
export async function adminDeletePost(postId: string): Promise<void>;
export async function setUserBanned(userId: string, banned: boolean, reason: string): Promise<void>;
export async function saveAd(formData: FormData): Promise<void>;
```
Every one starts with `await requireAdmin()`. `setUserBanned` calls the `community_ban_user` RPC. `saveAd` upserts on the now-unique `slot`. All `revalidatePath("/admin/community")` and, where user-visible, `revalidatePath("/community")`.

`setPostHidden` writes `hidden`, `hidden_reason`, and `hidden_notified = notify` — the flag is a record of intent; no email is sent here.

- [ ] Write it. `tsc` clean. Commit.

---

### Task 5: `/admin/community` page + nav

**Files:**
- Create: `src/app/admin/community/page.tsx`
- Modify: `src/components/admin/layout/nav-config.tsx`

Sections (server component, `export const dynamic = "force-dynamic"`, `PageHeader`):
1. **Reports queue** — from `community_reports_queue()`. Each row: post body excerpt, author `@handle`, reporter `@handle`, reason, time. Buttons: Resolve · Hide · Demote · Delete · Ban/Unban author.
2. **Recent posts** — newest 25 (admin sees hidden). Toggle hide/demote, delete.
3. **Ad slots** — two forms (slot 1, slot 2): image URL, link URL, active checkbox → `saveAd`.

Nav: add `{ label: "Community", href: "/admin/community", icon: MessagesSquare }` to the **Members** group.

- [ ] Write it. `tsc` + `eslint` clean. Commit.

---

### Task 6: Verification

- [ ] `npx vitest run` → all pass.
- [ ] `npx tsc --noEmit` → 0. `npx eslint …` → 0.
- [ ] `npx next build` → **its own exit code** 0; `/admin/community` present in the route list.
- [ ] Dev server: `/admin/community` while signed out → redirect (the `requireAdmin()` layout guard).
- [ ] After the user applies the migration: report a post as a member → it appears in the queue; Hide → the post leaves `/community` (RLS `community_posts_read`); Demote → it leaves every sort (the Plan 2 review fix); Ban → that author's posts drop out of the feed (`community_feed` filters `pr0.banned`); Resolve → it leaves the queue; save an ad → it renders in the right rail.

## Self-Review

**Spec coverage (design Phase 6):** report button ✓ (Tasks 2–3) · `/admin/community` with delete / hide (silent or notified) / ban / demote ✓ (Tasks 4–5) · resolve reports ✓ · ad-slot editor ✓. Owner-delete ✓ (Task 2).

**Reuses Plan 1's RLS rather than adding privilege:** admin update/delete on `community_posts`, admin read on `community_reports`, authenticated insert on reports, owner delete — all already live. Only `community_ban_user` needed a new definer RPC, because `profiles` is self-write.

**Schema fix included:** unique index on `community_ads(slot)` — Plan 1 checked the value but never enforced one row per slot.

**Security:** `requireAdmin()` in the layout *and* every action; `is_admin()` inside the RPCs and RLS. A non-admin calling `community_reports_queue` gets zero rows (SQL functions can't `raise`), and `community_ban_user` raises. `reportPost` deliberately does not require `community_can_post`, so a banned user can still report abuse.

**Honest ceiling:** `hidden_notified` records whether the user *should* be told; no notification is sent. Image NSFW detection remains out of scope (report + admin is the path), as stated since the design.
