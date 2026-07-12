-- =====================================================================
-- /community auto-poster: idempotency key, owner resolver, size milestone.
-- Target: OWN Supabase (NOT the BAS project). Apply MANUALLY via SQL editor.
-- Idempotent — safe to re-run.
-- =====================================================================

-- ---------- idempotency: one auto-post per source event ----------
alter table public.community_posts add column if not exists auto_key text;
-- Nullable + unique: manual posts leave it null (Postgres allows many nulls);
-- auto-posts set a stable key so retries/re-saves can't double-post.
create unique index if not exists community_posts_auto_key_key
  on public.community_posts (auto_key) where auto_key is not null;

-- ---------- owner profile id (single source of truth) ----------
-- Same admin email literal as public.is_admin(). security definer so it can
-- read auth.users from the trigger and from the service-role client.
create or replace function public.community_owner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = 'bookasloth@gmail.com'
  limit 1;
$$;
grant execute on function public.community_owner_id() to anon, authenticated, service_role;

-- ---------- community-size milestone (signup has no app hook) ----------
-- handle_new_user() creates a profile per signup via a DB trigger, so this
-- milestone must also live in the DB. On crossing a threshold exactly, insert
-- one owner-authored post. auto_key + the unique index make it fire once.
create or replace function public.community_size_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n        int;
  owner_id uuid;
  msgs     text[] := array[
    'The community just crossed {n} members. Glad you''re all here.',
    'We just hit {n} members. Thanks for being part of this.',
    '{n} people in the community now. Welcome, all of you.',
    'Milestone: {n} members strong.',
    'Just passed {n} members. This is growing into something.',
    '{n} of us here now. Grateful for every one.',
    'The community reached {n} members today.',
    'Officially {n} members. Thanks for showing up.',
    '{n} members and counting. Welcome aboard.',
    'We are now {n} strong. Good to have you here.'
  ];
  body text;
begin
  -- ponytail: exact-count check can miss a threshold under concurrent signups
  -- (READ COMMITTED); upgrade to a locked counter/sequence if it ever matters.
  select count(*) into n from public.profiles;
  if n not in (10, 25, 50, 100, 250, 500, 1000) then
    return null;
  end if;
  owner_id := public.community_owner_id();
  if owner_id is null then
    return null;
  end if;
  body := replace(msgs[1 + floor(random() * array_length(msgs, 1))::int], '{n}', n::text);
  -- Best-effort: this trigger runs INSIDE the signup transaction, so an
  -- auto-post must never abort a signup. Swallow any insert failure (e.g. a
  -- future NOT-NULL-without-default column added to community_posts).
  begin
    insert into public.community_posts (user_id, type, body, auto_key)
    values (owner_id, 'text', body, 'member-milestone:' || n)
    on conflict do nothing;
  exception when others then null;
  end;
  return null;
end $$;

drop trigger if exists community_size_milestone_trg on public.profiles;
create trigger community_size_milestone_trg
  after insert on public.profiles
  for each row execute function public.community_size_milestone();
