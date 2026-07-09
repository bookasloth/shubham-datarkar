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
