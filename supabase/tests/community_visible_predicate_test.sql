-- =====================================================================
-- Policy test — F-16 shared predicate: audience is now enforced on the permalink
-- (community_post) and inside threads (community_replies), not just the feed.
-- Target: OWN Supabase. Run like a migration. Rolls back. Run 20260903000001 first.
--   author = 11111111-…  follower = 22222222-…  stranger = 33333333-…
-- =====================================================================

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'pred_author@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'pred_follower@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'pred_stranger@test.local', '', now(), now(), now(), '{}', '{}');

update public.profiles set username = 'pred_author'   where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set username = 'pred_follower' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set username = 'pred_stranger' where id = '33333333-3333-3333-3333-333333333333';

insert into public.community_follows (follower_id, followee_id)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

-- A public root, a followers-only root, and a followers-only REPLY under the public root.
insert into public.community_posts (id, user_id, type, body, audience, publish_at, parent_id) values
  ('dddd0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'public root',     'everyone',  now(), null),
  ('dddd0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'followers root',  'followers', now(), null),
  ('dddd0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'followers reply', 'followers', now(), 'dddd0001-0000-0000-0000-000000000000');

-- ---------- permalink (community_post) now enforces audience ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"pred_stranger@test.local"}';
do $$
declare pub bigint := (select public_id from public.community_posts where id = 'dddd0002-0000-0000-0000-000000000000');
begin
  assert (select count(*) from public.community_post(pub)) = 0,
    'PERMALINK: stranger must NOT see a followers-only post (F-16 fix)';
  -- and the followers-only reply is not in the public root''s thread for a stranger
  assert not exists (select 1 from public.community_replies('dddd0001-0000-0000-0000-000000000000')
                     where id = 'dddd0003-0000-0000-0000-000000000000'),
    'REPLIES: stranger must NOT see a followers-only reply (F-16 fix)';
end $$;
reset role;

-- Follower sees both.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"pred_follower@test.local"}';
do $$
declare pub bigint := (select public_id from public.community_posts where id = 'dddd0002-0000-0000-0000-000000000000');
begin
  assert (select count(*) from public.community_post(pub)) = 1,
    'PERMALINK: follower sees the followers-only post';
  assert exists (select 1 from public.community_replies('dddd0001-0000-0000-0000-000000000000')
                 where id = 'dddd0003-0000-0000-0000-000000000000'),
    'REPLIES: follower sees the followers-only reply';
end $$;
reset role;

-- Owner sees their own followers-only post by permalink even as author.
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"pred_author@test.local"}';
do $$
declare pub bigint := (select public_id from public.community_posts where id = 'dddd0002-0000-0000-0000-000000000000');
begin
  assert (select count(*) from public.community_post(pub)) = 1,
    'PERMALINK: owner sees their own followers-only post';
end $$;
reset role;

-- ---------- the predicate itself ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"pred_stranger@test.local"}';
do $$ begin
  assert public.community_visible_public(false, now(), '11111111-1111-1111-1111-111111111111', 'everyone') = true,
    'predicate: public live post visible to anyone';
  assert public.community_visible_public(false, now(), '11111111-1111-1111-1111-111111111111', 'followers') = false,
    'predicate: followers-only invisible to a non-follower';
  assert public.community_visible_public(true, now(), '11111111-1111-1111-1111-111111111111', 'everyone') = false,
    'predicate: hidden invisible';
  assert public.community_visible_public(false, null, '11111111-1111-1111-1111-111111111111', 'everyone') = false,
    'predicate: draft (null publish_at) invisible';
end $$;
reset role;

do $$ begin raise notice 'community_visible_predicate_test: ALL ASSERTIONS PASSED'; end $$;

rollback;
