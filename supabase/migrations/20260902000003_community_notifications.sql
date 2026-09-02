-- =====================================================================
-- /community — in-app notifications. Target: OWN Supabase. Apply MANUALLY.
-- Idempotent.
--
-- WHY
-- There was no notification system — only five hardcoded transactional emails.
-- A like, reblog or quote told nobody; a follow only emailed. This adds a
-- durable per-recipient record for every direct engagement, an in-app bell, and
-- a notifications page. Email stays as-is for now (reply/mention/follow); a
-- digest that reads these rows is a later phase.
--
-- Rows are WRITTEN server-side via the service role (see src/lib/community/
-- notify.ts) — bypasses RLS, so no client INSERT policy exists. Recipients read
-- their own rows (RLS) and mark them read via a definer RPC.
--
-- Depends on 20260710000001 (community_posts, profiles).
-- =====================================================================

create table if not exists public.community_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,        -- recipient
  actor_id   uuid references public.profiles(id) on delete cascade,                 -- who did it
  verb       text not null check (verb in ('like','reply','mention','follow','reblog','quote')),
  post_id    uuid references public.community_posts(id) on delete cascade,          -- object (deep link); null for follow
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists community_notifications_user_idx
  on public.community_notifications (user_id, created_at desc);
create index if not exists community_notifications_unread_idx
  on public.community_notifications (user_id) where read_at is null;

alter table public.community_notifications enable row level security;

-- Recipient reads only their own. No client INSERT/UPDATE/DELETE policy — writes
-- are service-role (notify.ts); read-marking goes through the definer RPC below.
drop policy if exists community_notifications_own_read on public.community_notifications;
create policy community_notifications_own_read on public.community_notifications
  for select to authenticated using (user_id = auth.uid());

-- ---------- list (enriched: actor + post snippet), viewer-scoped ----------
create or replace function public.community_notifications_list(
  p_limit  int default 30,
  p_offset int default 0
)
returns table (
  id uuid, verb text, created_at timestamptz, read_at timestamptz,
  actor_username text, actor_display_name text, actor_avatar_url text,
  post_public_id bigint, post_snippet text
)
language sql stable security definer set search_path = public as $$
  select n.id, n.verb, n.created_at, n.read_at,
         a.username, a.display_name, a.avatar_url,
         p.public_id,
         case when p.body is null then null
              else left(p.body, 80) end
  from public.community_notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.community_posts p on p.id = n.post_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;
grant execute on function public.community_notifications_list(int, int) to authenticated;

-- ---------- unread count ----------
create or replace function public.community_notifications_unread()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.community_notifications
  where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.community_notifications_unread() to authenticated;

-- ---------- mark all read ----------
create or replace function public.community_notifications_mark_read()
returns void language sql volatile security definer set search_path = public as $$
  update public.community_notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.community_notifications_mark_read() to authenticated;
