-- =====================================================================
-- /community — engage: generalized feed + post/replies read RPCs.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001 + 20260710000003.
-- Viewer identity is auth.uid() everywhere — never a parameter.
-- =====================================================================

-- Old 4-arg version must go, or the 6-arg one becomes an ambiguous overload.
drop function if exists public.community_feed(text, text, int, int);

create or replace function public.community_feed(
  p_sort       text    default 'new',
  p_window     text    default 'all',
  p_limit      int     default 20,
  p_offset     int     default 0,
  p_author     text    default null,   -- username filter (profile pages)
  p_bookmarked boolean default false   -- only the viewer's bookmarks
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
           (p.up_count - p.down_count) as score,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from public.community_posts p
    join public.profiles pr0 on pr0.id = p.user_id
    where p.parent_id is null
      and not p.hidden
      and not pr0.banned
      and (p_author is null or lower(pr0.username) = lower(p_author))
      and (not p_bookmarked or exists (
            select 1 from public.community_bookmarks bm
            where bm.post_id = p.id and bm.user_id = auth.uid()))
  ),
  filtered as (
    select * from base
    where not demoted
      and (case when p_sort = 'controversial' then is_controversial
                else not is_controversial end)
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
  left join public.community_votes     v on v.post_id = f.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = f.id and b.user_id = auth.uid()
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
    f.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_feed(text, text, int, int, text, boolean) to anon, authenticated;

-- ---------- single root post ----------
create or replace function public.community_post(p_id uuid)
returns table (
  id uuid, user_id uuid, username text, display_name text, badge text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.user_id, pr.username, pr.display_name,
         public.community_badge(p.user_id) as badge,
         p.type, p.body, p.images, p.youtube_id, p.poll,
         p.up_count, p.down_count, (p.up_count - p.down_count) as score,
         p.reply_count, p.reblog_count, p.reblog_of, p.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.id = p_id and not p.hidden and not pr.banned;
$$;

grant execute on function public.community_post(uuid) to anon, authenticated;

-- ---------- replies to a post (oldest first) ----------
create or replace function public.community_replies(
  p_post   uuid,
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  id uuid, user_id uuid, username text, display_name text, badge text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.user_id, pr.username, pr.display_name,
         public.community_badge(p.user_id) as badge,
         p.type, p.body, p.images, p.youtube_id, p.poll,
         p.up_count, p.down_count, (p.up_count - p.down_count) as score,
         p.reply_count, p.reblog_count, p.reblog_of, p.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.parent_id = p_post and not p.hidden and not pr.banned
  order by p.created_at asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_replies(uuid, int, int) to anon, authenticated;
