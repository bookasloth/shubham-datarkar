-- =====================================================================
-- Policy test — soft delete: owner-only, hides everywhere, restorable, and
-- restore can't un-hide a moderator's hide. Target: OWN Supabase. Run like a
-- migration. Rolls back. Run 20260903000002 first.
--   author = 11111111-…   other = 22222222-…
-- =====================================================================

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'sd_author@test.local', '', now(), now(), now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'sd_other@test.local', '', now(), now(), now(), '{}', '{}');

insert into public.community_posts (id, user_id, type, body, audience, publish_at) values
  ('eeee0001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'text', 'a post', 'everyone', now());

-- A non-owner cannot soft-delete someone else's post.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"sd_other@test.local"}';
do $$ begin
  assert public.community_soft_delete('eeee0001-0000-0000-0000-000000000000') is null,
    'non-owner cannot soft-delete';
end $$;
reset role;

-- Owner soft-deletes; the post then vanishes for a stranger (permalink + feed).
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"sd_author@test.local"}';
do $$ begin
  assert public.community_soft_delete('eeee0001-0000-0000-0000-000000000000') is not null,
    'owner soft-deletes own post';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"sd_other@test.local"}';
do $$
declare pub bigint := (select public_id from public.community_posts where id = 'eeee0001-0000-0000-0000-000000000000');
begin
  assert (select count(*) from public.community_post(pub)) = 0,
    'deleted post is gone from the permalink';
  assert (select count(*) from public.community_feed('new','all',50,0,'sd_author')) = 0,
    'deleted post is gone from the feed';
end $$;
reset role;

-- Owner restores; the post comes back for the stranger.
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"sd_author@test.local"}';
do $$ begin
  assert public.community_restore('eeee0001-0000-0000-0000-000000000000') is not null,
    'owner restores own post';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","email":"sd_other@test.local"}';
do $$
declare pub bigint := (select public_id from public.community_posts where id = 'eeee0001-0000-0000-0000-000000000000');
begin
  assert (select count(*) from public.community_post(pub)) = 1,
    'restored post is visible again';
end $$;
reset role;

-- Restore cannot un-hide a MODERATOR hide (deleted_at is null on an admin-hidden post).
update public.community_posts set hidden = true where id = 'eeee0001-0000-0000-0000-000000000000';
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","email":"sd_author@test.local"}';
do $$ begin
  assert public.community_restore('eeee0001-0000-0000-0000-000000000000') is null,
    'restore is a no-op on an admin-hidden (not owner-deleted) post';
end $$;
reset role;

do $$ begin raise notice 'community_soft_delete_test: ALL ASSERTIONS PASSED'; end $$;

rollback;
