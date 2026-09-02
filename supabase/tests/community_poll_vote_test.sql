-- =====================================================================
-- Policy test — community_poll_vote enforces poll rules in the DB.
-- Target: OWN Supabase. Run like a migration (SQL editor / psql). Rolls back.
--
-- Run 20260902000004 first, then this. A failed ASSERT names the broken case.
-- Plain SQL only (no psql \set) so it runs in the Supabase SQL editor too.
--   author = 11111111-…  voter1 = 22222222-…  voter2 = 33333333-…
-- =====================================================================

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'poll_author@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'poll_voter1@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'poll_voter2@test.local', '', now(), now(), now(), '{}', '{}');

-- Open poll, closed poll, a draft poll, and a plain text post.
insert into public.community_posts (id, user_id, type, body, poll, publish_at) values
  ('bbbb0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'poll', null,
   '{"options":[{"i":0,"label":"A"},{"i":1,"label":"B"}]}'::jsonb, now()),
  ('bbbb0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'poll', null,
   ('{"options":[{"i":0,"label":"A"},{"i":1,"label":"B"}],"closes_at":"' || (now() - interval '1 hour')::text || '"}')::jsonb, now()),
  ('bbbb0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'poll', null,
   '{"options":[{"i":0,"label":"A"}]}'::jsonb, null),                                   -- draft (publish_at null)
  ('bbbb0004-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'not a poll', null, now());

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"poll_voter1@test.local"}';
do $$ begin
  assert public.community_poll_vote('bbbb0001-0000-0000-0000-000000000000', 0) = 'ok',
    'open poll, valid option → ok';
  assert public.community_poll_vote('bbbb0001-0000-0000-0000-000000000000', 1) = 'already',
    'second vote by same user → already (once-only)';
  -- unknown_option is checked before the once-only conflict, so it wins even for
  -- a user who has already voted.
  assert public.community_poll_vote('bbbb0001-0000-0000-0000-000000000000', 9) = 'unknown_option',
    'nonexistent option → unknown_option';
  assert public.community_poll_vote('bbbb0002-0000-0000-0000-000000000000', 0) = 'closed',
    'closed poll → closed';
  assert public.community_poll_vote('bbbb0003-0000-0000-0000-000000000000', 0) = 'draft',
    'draft poll → draft';
  assert public.community_poll_vote('bbbb0004-0000-0000-0000-000000000000', 0) = 'not_poll',
    'text post → not_poll';
end $$;
reset role;

-- Fresh voter for the unknown-option case (voter1 already used their one vote).
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","email":"poll_voter2@test.local"}';
do $$ begin
  assert public.community_poll_vote('bbbb0001-0000-0000-0000-000000000000', 9) = 'unknown_option',
    'nonexistent option → unknown_option';
  -- And a valid vote by a different user still works + tallies.
  assert public.community_poll_vote('bbbb0001-0000-0000-0000-000000000000', 1) = 'ok',
    'second distinct voter, valid option → ok';
end $$;
reset role;

-- Two distinct valid votes recorded on the open poll.
do $$ begin
  assert (select count(*) from public.community_poll_votes
          where post_id = 'bbbb0001-0000-0000-0000-000000000000') = 2,
    'exactly two votes recorded on the open poll';
end $$;

do $$ begin raise notice 'community_poll_vote_test: ALL ASSERTIONS PASSED'; end $$;

rollback;
