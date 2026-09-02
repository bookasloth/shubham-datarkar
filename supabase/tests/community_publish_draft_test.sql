-- =====================================================================
-- Policy test — community_publish_draft: owner publishes own draft; nobody else,
-- and never a live/hidden post. Target: OWN Supabase. Run like a migration.
-- Rolls back. Run 20260902000005 first.
--   author = 11111111-…   other = 22222222-…
-- =====================================================================

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'pub_author@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'pub_other@test.local', '', now(), now(), now(), '{}', '{}');

insert into public.community_posts (id, user_id, type, body, publish_at, hidden) values
  ('cccc0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'draft',     null,               false),
  ('cccc0002-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'scheduled', now() + interval '1 day', false),
  ('cccc0003-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'live',      now(),              false),
  ('cccc0004-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'hiddendraft', null,             true);

-- A non-owner cannot publish the author's draft.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"pub_other@test.local"}';
do $$ begin
  assert (select count(*) from public.community_publish_draft('cccc0001-0000-0000-0000-000000000000')) = 0,
    'non-owner cannot publish someone else''s draft';
end $$;
reset role;

-- The owner CAN publish their own draft (the F-10 bug: this returned 0 before).
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"pub_author@test.local"}';
do $$ begin
  assert (select count(*) from public.community_publish_draft('cccc0001-0000-0000-0000-000000000000')) = 1,
    'owner publishes their own draft';
  -- and it is now live
  assert (select publish_at is not null and publish_at <= now()
          from public.community_posts where id = 'cccc0001-0000-0000-0000-000000000000'),
    'published draft is now live';
  -- a scheduled post can be published early too
  assert (select count(*) from public.community_publish_draft('cccc0002-0000-0000-0000-000000000000')) = 1,
    'owner publishes their own scheduled post early';
  -- an already-live post is not re-published (nothing to do)
  assert (select count(*) from public.community_publish_draft('cccc0003-0000-0000-0000-000000000000')) = 0,
    'already-live post yields nothing';
  -- a hidden (moderated) draft cannot be surfaced via publish
  assert (select count(*) from public.community_publish_draft('cccc0004-0000-0000-0000-000000000000')) = 0,
    'hidden post cannot be published (no moderation evasion)';
end $$;
reset role;

do $$ begin raise notice 'community_publish_draft_test: ALL ASSERTIONS PASSED'; end $$;

rollback;
