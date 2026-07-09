-- =====================================================================
-- /community — feed read RPC (ranking lives here; JS can't express it).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001_community_schema.sql.
-- =====================================================================

-- ponytail: security definer so community_badge (reads auth.users/supports)
-- works and hidden filtering is centralized. p_viewer only drives the
-- viewer's OWN vote/bookmark join, so the server MUST pass the authenticated
-- user's id (never a client-supplied one).
create or replace function public.community_feed(
  p_sort   text default 'new',
  p_window text default 'all',
  p_viewer uuid default null,
  p_limit  int  default 20,
  p_offset int  default 0
)
returns table (
  id uuid, user_id uuid, username text, display_name text, badge text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean
)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.*,
           (p.up_count - p.down_count)                                as score,
           (p.up_count + p.down_count)                                as n,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from public.community_posts p
    where p.parent_id is null   -- feed shows root posts + reblogs, not replies
      and not p.hidden
  ),
  filtered as (
    select * from base
    where (case when p_sort = 'controversial' then is_controversial
                else (not is_controversial and not demoted) end)
      and (case
             when p_sort = 'top' and p_window <> 'all'
               then created_at >= now() - (case p_window
                      when 'today' then interval '1 day'
                      when 'week'  then interval '7 days'
                      when 'month' then interval '30 days'
                      when 'year'  then interval '365 days'
                      else interval '1000 years' end)
             else true end)
  )
  select f.id, f.user_id, pr.username, pr.display_name,
         public.community_badge(f.user_id) as badge,
         f.type, f.body, f.images, f.youtube_id, f.poll,
         f.up_count, f.down_count, f.score, f.reply_count, f.reblog_count,
         f.reblog_of, f.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked
  from filtered f
  join public.profiles pr on pr.id = f.user_id
  left join public.community_votes     v on v.post_id = f.id and v.user_id = p_viewer
  left join public.community_bookmarks b on b.post_id = f.id and b.user_id = p_viewer
  order by
    case when p_sort = 'new' then extract(epoch from f.created_at) end desc nulls last,
    case when p_sort = 'top' then f.score end desc nulls last,
    case when p_sort = 'hot' then
      sign(f.score) * log(greatest(abs(f.score), 1)) + extract(epoch from f.created_at) / 45000
    end desc nulls last,
    case when p_sort = 'controversial' then
      power(greatest(f.up_count + f.down_count, 1),
            least(f.up_count, f.down_count)::numeric / greatest(f.up_count, f.down_count, 1))
    end desc nulls last,
    f.created_at desc  -- stable tiebreak for all sorts
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_feed(text, text, uuid, int, int) to anon, authenticated;
