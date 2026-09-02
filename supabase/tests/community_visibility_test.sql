-- =====================================================================
-- Policy test — /community post visibility + account deactivation.
-- Target: OWN Supabase. Run the SAME way as a migration (SQL editor / psql).
--
-- WHY THIS FILE EXISTS
-- The 897-test vitest suite is all pure functions; nothing executes an RLS
-- policy, an RPC filter, or a trigger — which is the exact layer that holds the
-- visibility rules and the exact layer 20260902000001 changes. This is that
-- missing coverage: it seeds three real users (author, follower, stranger),
-- exercises every read path from each side, and asserts what each may see.
--
-- SELF-CONTAINED + SAFE: everything runs inside one transaction that ROLLS BACK
-- at the end, so it leaves no rows behind. Run 20260902000001 first, then this.
-- A failed ASSERT aborts with the message naming the case that broke.
--
-- HOW IT SIMULATES A VIEWER
-- Supabase auth.uid() reads request.jwt.claims->>'sub' and is_admin() reads
-- ->>'email'. We `set local role authenticated` (so RLS actually applies —
-- the postgres session role bypasses it) and set the claims per viewer.
-- =====================================================================

-- NOTE: plain SQL only (no psql \set / :vars) so this runs unchanged in the
-- Supabase SQL editor as well as psql. Fixed ids:
--   A author   = 11111111-1111-1111-1111-111111111111
--   B follower = 22222222-2222-2222-2222-222222222222
--   C stranger = 33333333-3333-3333-3333-333333333333
begin;

-- ---------- seed auth.users (the handle_new_user trigger creates profiles) ----------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'vis_author@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'vis_follower@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'vis_stranger@test.local', '', now(), now(), now(), '{}', '{}');

-- Deterministic handles (the trigger mints a random suffix; the feed's author
-- filter keys on the handle, so pin it).
update public.profiles set username = 'vis_author'   where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set username = 'vis_follower' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set username = 'vis_stranger' where id = '33333333-3333-3333-3333-333333333333';

-- B follows A. C follows nobody.
insert into public.community_follows (follower_id, followee_id)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

-- Author A's four posts, one per visibility state.
insert into public.community_posts (id, user_id, type, body, audience, publish_at) values
  ('aaaa0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'A public post',         'everyone',  now()),
  ('aaaa0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'A followers-only post', 'followers', now()),
  ('aaaa0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'A draft',               'everyone',  null),
  ('aaaa0004-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'A scheduled post',      'everyone',  now() + interval '1 day');

-- =====================================================================
-- 1. Base-table RLS (the leak that 20260902000001 closes)
-- =====================================================================

-- Stranger C: only the public, live post. NOT the followers-only, draft, or scheduled.
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"vis_stranger@test.local"}';
do $$ begin
  assert (select count(*) from public.community_posts where user_id = '11111111-1111-1111-1111-111111111111') = 1,
    'RLS: stranger must see exactly 1 of author''s posts (public only)';
  assert not exists (select 1 from public.community_posts where id = 'aaaa0002-0000-0000-0000-000000000000'),
    'RLS: stranger must NOT see the followers-only post';
  assert not exists (select 1 from public.community_posts where id = 'aaaa0003-0000-0000-0000-000000000000'),
    'RLS: stranger must NOT see the draft';
  assert not exists (select 1 from public.community_posts where id = 'aaaa0004-0000-0000-0000-000000000000'),
    'RLS: stranger must NOT see the scheduled post';
end $$;
reset role;

-- Follower B: the public post AND the followers-only post. Still not draft/scheduled.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"vis_follower@test.local"}';
do $$ begin
  assert (select count(*) from public.community_posts where user_id = '11111111-1111-1111-1111-111111111111') = 2,
    'RLS: follower must see 2 of author''s posts (public + followers-only)';
  assert exists (select 1 from public.community_posts where id = 'aaaa0002-0000-0000-0000-000000000000'),
    'RLS: follower must see the followers-only post';
  assert not exists (select 1 from public.community_posts where id = 'aaaa0003-0000-0000-0000-000000000000'),
    'RLS: follower must NOT see the draft';
end $$;
reset role;

-- Owner A: all four of their own rows, including draft and scheduled.
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"vis_author@test.local"}';
do $$ begin
  assert (select count(*) from public.community_posts where user_id = '11111111-1111-1111-1111-111111111111') = 4,
    'RLS: owner must see all 4 of their own posts (incl draft + scheduled)';
end $$;
reset role;

-- =====================================================================
-- 2. The definer feed RPC (bypasses RLS — filters itself)
-- =====================================================================

-- Stranger C via community_feed(author=vis_author): public only.
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"vis_stranger@test.local"}';
do $$ begin
  assert (select count(*) from public.community_feed('new','all',50,0,'vis_author')) = 1,
    'FEED: stranger must get 1 post from author (public only)';
end $$;
reset role;

-- Follower B via feed: public + followers-only.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"vis_follower@test.local"}';
do $$ begin
  assert (select count(*) from public.community_feed('new','all',50,0,'vis_author')) = 2,
    'FEED: follower must get 2 posts from author (public + followers-only)';
end $$;
reset role;

-- =====================================================================
-- 3. Deactivation (v1): hides the account's content everywhere; reversible.
-- =====================================================================

update public.profiles set deactivated_at = now() where id = :'A';

-- Stranger C: author's posts vanish from both the base table and the feed.
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"vis_stranger@test.local"}';
do $$ begin
  assert (select count(*) from public.community_posts where user_id = '11111111-1111-1111-1111-111111111111') = 0,
    'DEACTIVATE: stranger must see 0 posts from a deactivated author (RLS)';
  assert (select count(*) from public.community_feed('new','all',50,0,'vis_author')) = 0,
    'DEACTIVATE: stranger must get 0 posts from a deactivated author (feed)';
end $$;
reset role;

-- Owner A still sees their own posts (so /community/me can show the reactivate CTA).
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"vis_author@test.local"}';
do $$ begin
  assert (select count(*) from public.community_posts where user_id = '11111111-1111-1111-1111-111111111111') = 4,
    'DEACTIVATE: owner still sees their own posts while deactivated';
end $$;
reset role;

-- Reactivate → everything returns for the stranger.
update public.profiles set deactivated_at = null where id = :'A';
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"vis_stranger@test.local"}';
do $$ begin
  assert (select count(*) from public.community_posts where user_id = '11111111-1111-1111-1111-111111111111') = 1,
    'REACTIVATE: stranger sees the public post again';
end $$;
reset role;

-- =====================================================================
-- All assertions passed if we reach here.
-- =====================================================================
do $$ begin raise notice 'community_visibility_test: ALL ASSERTIONS PASSED'; end $$;

rollback;
