# Community — Plan 1: Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the full database foundation for `/community` — tables, profile columns, counter triggers, and read-time helper functions — in one manually-applied Supabase migration.

**Architecture:** One additive, idempotent migration file (`supabase/migrations/20260710000001_community_schema.sql`). Denormalized vote/reply/reblog counters are maintained by `AFTER` triggers so feed reads never aggregate. Two `security definer` helpers (`community_can_post`, `community_badge`) encapsulate the cross-table reads (auth.users, supports, memberships) that RLS and the feed need. Follows the existing members-platform migration conventions exactly.

**Tech Stack:** PostgreSQL (Supabase), plpgsql/sql functions, RLS policies.

## Global Constraints

- **Target project:** Shubham's OWN Supabase, ref `oyzzgjrefkppqkxjccot`. **NEVER the BAS project.** (copied from existing migration headers)
- **Apply workflow:** MANUAL. This plan writes the migration file and commits it; it is **not** applied via any MCP tool. The final task hands the SQL to the user to paste into their project's SQL editor. (per project "Supabase manual SQL workflow")
- **Idempotent:** every object uses `if not exists` / `create or replace` / guarded `alter`, matching existing migrations — safe to re-run.
- **Admin identity:** `public.is_admin()` already exists (JWT email == `bookasloth@gmail.com`). Reuse it; do not redefine.
- **Existing reusable objects:** `public.touch_updated_at()` trigger fn, `public.is_admin()`, `public.profiles(id, username, created_at)`, `public.memberships(user_id, status)`, `public.supports(email, status)`. Do not recreate these.
- **Style:** lower-case SQL keywords, `snake_case`, RLS policies named `<table>_<audience>_<action>`, matching `20260707000001_members_platform.sql`.
- **No app code in this plan.** Schema only. UI/server-actions are Plans 2–6.

---

### Task 1: Profile columns for community identity

**Files:**
- Create: `supabase/migrations/20260710000001_community_schema.sql` (start the file here)

**Interfaces:**
- Produces: `profiles.display_name text`, `profiles.bio text`, `profiles.is_founder boolean`, `profiles.banned boolean`, `profiles.banned_reason text` — consumed by badge/moderation logic in later tasks and Plans 2/6.

- [ ] **Step 1: Write the migration header + profile alters**

Create `supabase/migrations/20260710000001_community_schema.sql`:

```sql
-- =====================================================================
-- /community — schema foundation (tables, counters, helpers, RLS).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). NOT the BAS project.
-- Apply MANUALLY via the SQL editor. Idempotent — safe to re-run.
-- =====================================================================

-- ---------- profiles: community identity columns ----------
alter table public.profiles add column if not exists display_name  text;
alter table public.profiles add column if not exists bio           text;
alter table public.profiles add column if not exists is_founder    boolean not null default false; -- gold badge, admin-set only
alter table public.profiles add column if not exists banned        boolean not null default false;
alter table public.profiles add column if not exists banned_reason text;
```

- [ ] **Step 2: Sanity-check the SQL parses (local dry check, no DB)**

Run: `git diff --stat supabase/migrations/20260710000001_community_schema.sql`
Expected: file shows as new/modified. (No live DB apply yet — that is Task 7.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "feat(community): profiles columns for community identity"
```

---

### Task 2: `community_posts` table

**Files:**
- Modify: `supabase/migrations/20260710000001_community_schema.sql` (append)

**Interfaces:**
- Produces: `public.community_posts` with columns `id, user_id, parent_id, reblog_of, type, body, images, youtube_id, poll, up_count, down_count, reply_count, reblog_count, hidden, hidden_reason, hidden_notified, demoted, created_at`. Every later task and Plan references these exact names.

- [ ] **Step 1: Append the table + indexes**

Append to the migration file:

```sql
-- ---------- posts (root, replies via parent_id, reblogs via reblog_of) ----------
create table if not exists public.community_posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  parent_id      uuid references public.community_posts(id) on delete cascade, -- reply target (root only)
  reblog_of      uuid references public.community_posts(id) on delete cascade, -- reblog source
  type           text not null check (type in ('text','image','poll','youtube')),
  body           text check (body is null or char_length(body) <= 500),
  images         jsonb,          -- array of storage paths, <=4 (type='image')
  youtube_id     text,           -- parsed 11-char video id (type='youtube')
  poll           jsonb,          -- {options:[{i,label}], closes_at} (type='poll')
  up_count       int not null default 0,
  down_count     int not null default 0,
  reply_count    int not null default 0,
  reblog_count   int not null default 0,
  hidden         boolean not null default false,
  hidden_reason  text,
  hidden_notified boolean not null default false,
  demoted        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- feed reads: root posts newest-first, and replies under a parent
create index if not exists community_posts_feed_idx
  on public.community_posts (created_at desc) where parent_id is null and reblog_of is null;
create index if not exists community_posts_parent_idx
  on public.community_posts (parent_id, created_at) where parent_id is not null;
create index if not exists community_posts_user_idx
  on public.community_posts (user_id, created_at desc);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "feat(community): community_posts table + feed indexes"
```

---

### Task 3: Engagement + moderation + ads tables

**Files:**
- Modify: `supabase/migrations/20260710000001_community_schema.sql` (append)

**Interfaces:**
- Produces: `community_votes(post_id,user_id,value)`, `community_poll_votes(post_id,user_id,option_index)`, `community_bookmarks(post_id,user_id,created_at)`, `community_reports(id,post_id,reporter_id,reason,resolved,created_at)`, `community_ads(id,slot,image_path,link_url,active,updated_at)`.

- [ ] **Step 1: Append the tables**

Append to the migration file:

```sql
-- ---------- votes: +1 up (heart) / -1 down (rotten egg), one per user ----------
create table if not exists public.community_votes (
  post_id  uuid not null references public.community_posts(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  value    smallint not null check (value in (-1, 1)),
  primary key (post_id, user_id)
);

-- ---------- poll votes: one option per user per poll ----------
create table if not exists public.community_poll_votes (
  post_id      uuid not null references public.community_posts(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  option_index int not null,
  primary key (post_id, user_id)
);

-- ---------- bookmarks (private) ----------
create table if not exists public.community_bookmarks (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists community_bookmarks_user_idx
  on public.community_bookmarks (user_id, created_at desc);

-- ---------- reports (moderation queue) ----------
create table if not exists public.community_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists community_reports_open_idx
  on public.community_reports (created_at desc) where not resolved;

-- ---------- ad slots (admin-editable, 2 slots) ----------
create table if not exists public.community_ads (
  id         uuid primary key default gen_random_uuid(),
  slot       smallint not null check (slot in (1, 2)),
  image_path text,
  link_url   text,
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists community_ads_touch on public.community_ads;
create trigger community_ads_touch before update on public.community_ads
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "feat(community): votes, poll votes, bookmarks, reports, ads tables"
```

---

### Task 4: Counter triggers (votes + replies/reblogs)

**Files:**
- Modify: `supabase/migrations/20260710000001_community_schema.sql` (append)

**Interfaces:**
- Consumes: `community_posts.{up_count,down_count,reply_count,reblog_count}`, `community_votes.value`, `community_posts.{parent_id,reblog_of}`.
- Produces: triggers keeping those counters correct on insert/update/delete. Feed queries in Plan 2 read the counters directly.

- [ ] **Step 1: Append the vote-counter function + trigger**

Append to the migration file:

```sql
-- ---------- keep up/down counts in sync with votes ----------
create or replace function public.community_vote_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set
      up_count   = up_count   + (new.value = 1)::int,
      down_count = down_count + (new.value = -1)::int
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set
      up_count   = greatest(0, up_count   - (old.value = 1)::int),
      down_count = greatest(0, down_count - (old.value = -1)::int)
    where id = old.post_id;
  elsif tg_op = 'UPDATE' and new.value <> old.value then
    update public.community_posts set
      up_count   = greatest(0, up_count   + (new.value = 1)::int  - (old.value = 1)::int),
      down_count = greatest(0, down_count + (new.value = -1)::int - (old.value = -1)::int)
    where id = new.post_id;
  end if;
  return null;
end $$;

drop trigger if exists community_votes_count on public.community_votes;
create trigger community_votes_count
  after insert or update or delete on public.community_votes
  for each row execute function public.community_vote_counts();
```

- [ ] **Step 2: Append the reply/reblog-counter function + trigger**

Append to the migration file:

```sql
-- ---------- keep reply_count / reblog_count in sync ----------
create or replace function public.community_post_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      update public.community_posts set reply_count = reply_count + 1 where id = new.parent_id;
    end if;
    if new.reblog_of is not null then
      update public.community_posts set reblog_count = reblog_count + 1 where id = new.reblog_of;
    end if;
  elsif tg_op = 'DELETE' then
    if old.parent_id is not null then
      update public.community_posts set reply_count = greatest(0, reply_count - 1) where id = old.parent_id;
    end if;
    if old.reblog_of is not null then
      update public.community_posts set reblog_count = greatest(0, reblog_count - 1) where id = old.reblog_of;
    end if;
  end if;
  return null;
end $$;

drop trigger if exists community_posts_count on public.community_posts;
create trigger community_posts_count
  after insert or delete on public.community_posts
  for each row execute function public.community_post_counts();
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "feat(community): counter triggers for votes, replies, reblogs"
```

---

### Task 5: Helper functions — `community_can_post`, `community_badge`

**Files:**
- Modify: `supabase/migrations/20260710000001_community_schema.sql` (append)

**Interfaces:**
- Produces:
  - `public.community_can_post() returns boolean` — true when the current auth user has a confirmed email and is not banned. Consumed by the `community_posts` insert RLS policy (Task 6) and Plan 3's create action.
  - `public.community_badge(p_user uuid) returns text` — `'gold' | 'orange' | 'grey'`. Consumed by Plan 2's feed rendering.

- [ ] **Step 1: Append `community_can_post()`**

Append to the migration file:

```sql
-- ---------- post gate: verified email + not banned ----------
create or replace function public.community_can_post()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select u.email_confirmed_at is not null and not coalesce(p.banned, false)
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid()
  ), false);
$$;
revoke execute on function public.community_can_post() from anon;
grant execute on function public.community_can_post() to authenticated;
```

- [ ] **Step 2: Append `community_badge()`**

Append to the migration file. Orange = active membership OR any paid support (donations are email-keyed in `public.supports`, so join by email per the identity design):

```sql
-- ---------- badge tier: gold (founder) > orange (member/donor) > grey (verified) ----------
create or replace function public.community_badge(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p.is_founder then 'gold'
    when exists (
      select 1 from public.memberships m
      where m.user_id = p_user and m.status = 'active'
    ) or exists (
      select 1
      from public.supports s
      join auth.users u on lower(u.email) = lower(s.email)
      where u.id = p_user and s.status = 'paid'
    ) then 'orange'
    else 'grey'
  end
  from public.profiles p
  where p.id = p_user;
$$;
grant execute on function public.community_badge(uuid) to anon, authenticated;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "feat(community): community_can_post + community_badge helpers"
```

---

### Task 6: RLS policies + grants

**Files:**
- Modify: `supabase/migrations/20260710000001_community_schema.sql` (append)

**Interfaces:**
- Consumes: `public.is_admin()`, `public.community_can_post()`.
- Produces: enabled RLS + policies. Read is public (non-hidden); posting gated to verified/non-banned; personal tables self-only; reports insert-any/read-admin; ads public-read/admin-write. Metering (3/day anon) is enforced in the app layer (Plan 2), NOT here.

- [ ] **Step 1: Append RLS enables + policies**

Append to the migration file:

```sql
-- ============ RLS ============
alter table public.community_posts      enable row level security;
alter table public.community_votes      enable row level security;
alter table public.community_poll_votes enable row level security;
alter table public.community_bookmarks  enable row level security;
alter table public.community_reports    enable row level security;
alter table public.community_ads        enable row level security;

-- posts: everyone reads non-hidden; owner + admin read hidden
drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
  for select to anon, authenticated
  using (not hidden or public.is_admin() or auth.uid() = user_id);

-- posts: insert only by verified, non-banned users, as themselves
drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts
  for insert to authenticated
  with check (auth.uid() = user_id and public.community_can_post());

-- posts: delete by owner or admin; update (hide/demote) by admin only
drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
  for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists community_posts_admin_update on public.community_posts;
create policy community_posts_admin_update on public.community_posts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- votes / poll votes / bookmarks: users touch only their own rows
drop policy if exists community_votes_self on public.community_votes;
create policy community_votes_self on public.community_votes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists community_poll_votes_self on public.community_poll_votes;
create policy community_poll_votes_self on public.community_poll_votes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists community_bookmarks_self on public.community_bookmarks;
create policy community_bookmarks_self on public.community_bookmarks
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- votes / poll votes / bookmarks: public read of vote rows is NOT needed
-- (counts are denormalized on the post). Only self-read above.

-- reports: any authenticated user files as themselves; only admin reads
drop policy if exists community_reports_insert on public.community_reports;
create policy community_reports_insert on public.community_reports
  for insert to authenticated with check (auth.uid() = reporter_id);

drop policy if exists community_reports_admin_read on public.community_reports;
create policy community_reports_admin_read on public.community_reports
  for select to authenticated using (public.is_admin());

drop policy if exists community_reports_admin_update on public.community_reports;
create policy community_reports_admin_update on public.community_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ads: public reads active slots; admin writes
drop policy if exists community_ads_public_read on public.community_ads;
create policy community_ads_public_read on public.community_ads
  for select to anon, authenticated using (active);

drop policy if exists community_ads_admin_all on public.community_ads;
create policy community_ads_admin_all on public.community_ads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "feat(community): RLS policies for community tables"
```

---

### Task 7: Manual apply + end-to-end verification

**Files:**
- Uses: `supabase/migrations/20260710000001_community_schema.sql` (complete)

This is the only task that touches the live database, and it is done **by the user** (manual SQL workflow). The agent's job is to (a) present the complete SQL, (b) supply the verification queries, (c) confirm results.

- [ ] **Step 1: Hand the migration to the user**

Tell the user: "Open your OWN Supabase project (`oyzzgjrefkppqkxjccot`) → SQL editor → paste the full contents of `supabase/migrations/20260710000001_community_schema.sql` → Run. It is idempotent, so a re-run is safe."

- [ ] **Step 2: Verify objects exist (user runs, pastes back output)**

```sql
-- expect 6 rows: community_ads, community_bookmarks, community_poll_votes,
--                community_posts, community_reports, community_votes
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'community_%'
order by table_name;

-- expect 5 rows: banned, banned_reason, bio, display_name, is_founder
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('display_name','bio','is_founder','banned','banned_reason')
order by column_name;

-- expect 2 rows: community_can_post, community_badge  (+ counters if listed)
select proname from pg_proc
where pronamespace = 'public'::regnamespace and proname like 'community_%'
order by proname;
```
Expected: table list = 6, profile columns = 5, functions include `community_badge`, `community_can_post`, `community_post_counts`, `community_vote_counts`.

- [ ] **Step 3: Functional check — counter triggers work**

Have the user run this in the SQL editor (uses the admin's own auth user id; rolls back so it leaves no data):

```sql
do $$
declare
  uid uuid := (select id from public.profiles limit 1);
  pid uuid;
begin
  insert into public.community_posts (user_id, type, body)
    values (uid, 'text', 'trigger self-test') returning id into pid;
  insert into public.community_votes (post_id, user_id, value) values (pid, uid, 1);
  assert (select up_count   from public.community_posts where id = pid) = 1, 'up_count should be 1';
  update public.community_votes set value = -1 where post_id = pid and user_id = uid;
  assert (select up_count   from public.community_posts where id = pid) = 0, 'up_count should be 0';
  assert (select down_count from public.community_posts where id = pid) = 1, 'down_count should be 1';
  raise exception 'rollback self-test';  -- abort so nothing persists
exception when others then
  raise notice 'counter self-test passed (rolled back)';
end $$;
```
Expected: notice `counter self-test passed (rolled back)`. If an `assert` fails, the counter trigger is wrong — fix Task 4 and re-apply.

- [ ] **Step 4: Update project memory**

After the user confirms success, record the applied migration in the auto-memory file for `/community` state (new memory file + `MEMORY.md` pointer), noting `20260710000001_community_schema` applied to prod DB, badge/gate helpers live, no UI yet.

- [ ] **Step 5: Final commit (if any header/comment tweaks were made during apply)**

```bash
git add supabase/migrations/20260710000001_community_schema.sql
git commit -m "chore(community): finalize schema migration after apply" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage (Phase 1 items):**
- Tables `community_posts`, `community_votes`, `community_poll_votes`, `community_bookmarks`, `community_reports`, `community_ads` → Tasks 2–3 ✓
- `profiles` columns (display_name, bio, is_founder, banned, banned_reason) → Task 1 ✓
- Counter triggers (denormalized up/down/reply/reblog) → Task 4 ✓
- Badge computation (gold/orange/grey, membership+donation email-join) → Task 5 ✓
- Post gate (verified + not banned) → Task 5 `community_can_post` + Task 6 insert policy ✓
- RLS (public read, gated insert, self-only personal, admin moderation/ads) → Task 6 ✓
- **Deferred within Phase 1, by design:** storage bucket `community-media` moves to Plan 3 (used only when image upload lands); moderation RPCs move to Plan 6 (colocated with the admin UI that calls them). Feed ranking SQL (Hot/Controversial) is a Plan 2 read concern, not schema. These are intentional relocations, noted here so coverage is traceable.

**Placeholder scan:** none — every step contains the literal SQL.

**Type consistency:** `community_can_post()`/`community_badge(uuid)` signatures in Task 5 match their uses in Task 6 (insert policy) and the Plan 2 handoff note. Counter column names (`up_count`, `down_count`, `reply_count`, `reblog_count`) are identical across Tasks 2, 4, and the verification in Task 7.

**Note on TDD adaptation:** this is a single manually-applied SQL migration, not app code, so the "failing test → pass" cycle is replaced by post-apply verification queries (Task 7, Steps 2–3) with explicit expected output. App-code Plans (2–6) return to standard test-first cycles.
