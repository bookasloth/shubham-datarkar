-- =====================================================================
-- /community — moderation: ban RPC + reports queue + ads slot uniqueness.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001.
-- =====================================================================

-- One ad row per slot. Without this an upsert-by-slot duplicates rows.
create unique index if not exists community_ads_slot_key on public.community_ads (slot);

-- profiles is self-write only, so banning needs an admin-gated definer RPC.
create or replace function public.community_ban_user(
  p_user   uuid,
  p_banned boolean,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  update public.profiles
     set banned = p_banned,
         banned_reason = case when p_banned then p_reason else null end
   where id = p_user;
end $$;

revoke execute on function public.community_ban_user(uuid, boolean, text) from anon;
grant execute on function public.community_ban_user(uuid, boolean, text) to authenticated;

-- Open reports, joined to the post and the two handles, newest first.
-- A SQL (non-plpgsql) definer function cannot raise, so the admin gate is a
-- predicate: a non-admin simply gets zero rows.
create or replace function public.community_reports_queue(
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  report_id uuid, post_id uuid, reason text, created_at timestamptz,
  post_body text, post_hidden boolean, post_demoted boolean,
  author_id uuid, author_username text, author_banned boolean,
  reporter_username text
)
language sql stable security definer set search_path = public as $$
  select r.id, r.post_id, r.reason, r.created_at,
         p.body, p.hidden, p.demoted,
         p.user_id, author.username, author.banned,
         reporter.username
  from public.community_reports r
  join public.community_posts p on p.id = r.post_id
  join public.profiles author   on author.id = p.user_id
  join public.profiles reporter on reporter.id = r.reporter_id
  where not r.resolved and public.is_admin()
  order by r.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

revoke execute on function public.community_reports_queue(int, int) from anon;
grant execute on function public.community_reports_queue(int, int) to authenticated;
