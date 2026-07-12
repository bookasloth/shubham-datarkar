-- =====================================================================
-- /community — compat shim: keep community_post(uuid) alongside the new
-- community_post(bigint) so a deploy of PR #157 is zero-downtime.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- 20260714000002 replaced community_post(uuid) with community_post(bigint).
-- Any community code still deployed on Vercel calls the uuid form (p_id) and
-- would break in the window before PR #157 ships. This restores that overload
-- as a thin id-keyed lookup; the two coexist by argument type. Drop this shim
-- once PR #157 is deployed and no caller uses p_id anymore.
-- Depends on 20260714000002.
-- =====================================================================

create or replace function public.community_post(p_id uuid)
returns table (
  row_id uuid, id uuid, public_id bigint, user_id uuid, username text, display_name text, badge text,
  reblogged_by text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean, viewer_reblogged boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.id, p.public_id, p.user_id, pr.username, pr.display_name,
         public.community_badge(p.user_id) as badge,
         null::text as reblogged_by,
         p.type, p.body, p.images, p.youtube_id, p.poll,
         p.up_count, p.down_count, (p.up_count - p.down_count) as score,
         p.reply_count, p.reblog_count, p.reblog_of, p.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked,
         exists (select 1 from public.community_posts rb
                 where rb.reblog_of = p.id and rb.user_id = auth.uid()) as viewer_reblogged
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.id = p_id and not p.hidden and not pr.banned;
$$;

grant execute on function public.community_post(uuid) to anon, authenticated;
