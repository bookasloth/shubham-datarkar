-- =====================================================================
-- /community — fix: "Publish now" was broken for every non-admin. Target: OWN
-- Supabase. Apply MANUALLY. Idempotent.
--
-- WHY
-- publishDraft() did `update community_posts set publish_at=now() where id=? and
-- user_id=?` through the session client. The ONLY UPDATE policy on the table is
-- community_posts_admin_update (is_admin()), so for a non-admin the update matched
-- zero rows, .maybeSingle() returned null, and the action reported "That draft no
-- longer exists." — while the draft sat there, unpublishable. It worked only for
-- the admin, which is the one account that ever tested it. (Audit F-10.)
--
-- FIX: a security-definer RPC, scoped to auth.uid(), matching the codebase's
-- pattern (set_username, community_set_deactivated). This deliberately does NOT
-- add an owner UPDATE policy or a column grant: an owner UPDATE policy would also
-- let an author flip `hidden`/`demoted` back (moderation evasion), and a column
-- grant would strip admin moderation's ability to write those columns. A narrow
-- definer that only ever sets publish_at avoids both.
--
-- Depends on 20260710000001 (community_posts) + 20260725000001 (publish_at).
-- =====================================================================

create or replace function public.community_publish_draft(p_post uuid)
returns table (public_id bigint, body text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;  -- no rows
  end if;
  return query
    update public.community_posts
       set publish_at = now()
     where id = p_post
       and user_id = auth.uid()        -- owner only
       and not hidden                  -- can't resurface a moderated post
       and (publish_at is null or publish_at > now())  -- only a draft / scheduled
    returning community_posts.public_id, community_posts.body;
end $$;

revoke all on function public.community_publish_draft(uuid) from anon;
grant execute on function public.community_publish_draft(uuid) to authenticated;
