-- =====================================================================
-- /community — fix: Hot's freshness bump overflowed int4.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- 20260725000001 ordered Hot by
--     hashtext(row_id || seed) - (bump if the post is under 2 days old)
--
-- `hashtext` returns int4. Its range is -2147483648..2147483647, so for any row
-- whose hash lands below -647483648 the subtraction of 1500000000 falls off the
-- bottom of the type and Postgres raises 22003 "integer out of range" — for the
-- WHOLE query, not that row. listFeed swallows the error and returns [], so the
-- symptom was an empty Hot tab, not a 500.
--
-- Cast to bigint before subtracting. int8 has ~4 billion times the headroom
-- needed, the ordering is otherwise identical, and no signature or OUT column
-- changes — so this one is a plain `create or replace`.
--
-- A unit test could not have caught this: JS numbers don't overflow at 2^31.
-- Only a probe against the real database does, which is what found it.
--
-- Depends on 20260725000001_community_social_layer.sql.
-- =====================================================================

create or replace function public.community_feed(
  p_sort       text    default 'new',
  p_window     text    default 'all',
  p_limit      int     default 20,
  p_offset     int     default 0,
  p_author     text    default null,
  p_bookmarked boolean default false,
  p_reblogged  boolean default false,
  p_liked      boolean default false,
  p_seed       int     default 0,
  p_following  boolean default false,
  p_tag        text    default null
)
returns table (
  row_id uuid, id uuid, public_id bigint, user_id uuid, username text, display_name text, badge text,
  reblogged_by text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean, viewer_reblogged boolean,
  bookmark_count int, avatar_url text,
  meta jsonb, tags text[],
  quoted_id bigint, quoted_username text, quoted_body text, quoted_type text,
  quoted_images jsonb, quoted_created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with rows_ as (
    select r.id                                as row_id,
           r.created_at                        as row_created_at,
           r.reblog_of,
           r.body                              as row_body,
           actor.username                      as actor_username,
           -- A BARE reblog resolves to its source. A QUOTE (a reblog row that
           -- carries its own body) resolves to ITSELF — its text is the post,
           -- and the source rides along in the quoted_* columns below.
           case when r.reblog_of is not null and r.body is null
                then coalesce(o.id, r.id) else r.id end as src_id
    from public.community_posts r
    join public.profiles actor on actor.id = r.user_id
    left join public.community_posts o on o.id = r.reblog_of
    where r.parent_id is null
      and not r.hidden
      and not actor.banned
      and (r.reblog_of is null or (o.id is not null and not o.hidden))
      and (p_author is null or lower(actor.username) = lower(p_author))
      -- Drafts (null) and scheduled posts (future) are invisible until due.
      and r.publish_at is not null and r.publish_at <= now()
      -- Mute is unconditional — no param. Applied to the ACTOR here and to the
      -- source author in `src`, so a muted person stays hidden even when
      -- someone you follow reblogs them.
      and not exists (select 1 from public.community_mutes m
                      where m.muter_id = auth.uid() and m.muted_id = r.user_id)
      -- Followers-only posts are visible to the author and their followers.
      and (r.audience = 'everyone'
           or r.user_id = auth.uid()
           or exists (select 1 from public.community_follows fa
                      where fa.follower_id = auth.uid() and fa.followee_id = r.user_id))
      -- Following tab. Filters on the ACTOR, not the source author: if you
      -- follow someone, their reblogs belong in your Following feed.
      and (not p_following or exists (select 1 from public.community_follows f
                                      where f.follower_id = auth.uid()
                                        and f.followee_id = r.user_id))
  ),
  src as (
    select rw.row_id,
           rw.row_created_at,
           case when rw.reblog_of is not null and rw.row_body is null
                then rw.actor_username end as reblogged_by,
           p.id, p.public_id, p.user_id, p.type, p.body, p.images, p.youtube_id, p.poll,
           p.up_count, p.down_count, p.reply_count, p.reblog_count, p.bookmark_count,
           p.reblog_of, p.created_at, p.demoted, p.meta, p.tags,
           (p.up_count - p.down_count) as score,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from rows_ rw
    join public.community_posts p on p.id = rw.src_id
    join public.profiles sa on sa.id = p.user_id
    where not p.hidden
      and not sa.banned
      and p.publish_at is not null and p.publish_at <= now()
      and not exists (select 1 from public.community_mutes m2
                      where m2.muter_id = auth.uid() and m2.muted_id = p.user_id)
      and (p.audience = 'everyone'
           or p.user_id = auth.uid()
           or exists (select 1 from public.community_follows fs
                      where fs.follower_id = auth.uid() and fs.followee_id = p.user_id))
      and (p_tag is null or p.tags @> array[p_tag])
      and (not p_bookmarked or exists (
            select 1 from public.community_bookmarks bm
            where bm.post_id = p.id and bm.user_id = auth.uid()))
      and (not p_reblogged or exists (
            select 1 from public.community_posts rp
            where rp.reblog_of = p.id and rp.user_id = auth.uid()))
      and (not p_liked or exists (
            select 1 from public.community_votes v
            where v.post_id = p.id and v.user_id = auth.uid() and v.value = 1))
  ),
  filtered as (
    select * from src
    where (p_author is not null or p_bookmarked or p_reblogged or p_liked
           or (not demoted
               and (case when p_sort = 'controversial' then is_controversial
                         else not is_controversial end)))
      and (case
             when p_sort = 'top' and p_window <> 'all'
               then row_created_at >= now() - (case p_window
                      when 'today' then interval '1 day'
                      when 'week'  then interval '7 days'
                      when 'month' then interval '30 days'
                      when 'year'  then interval '365 days'
                      else interval '1000 years' end)
             else true end)
  )
  select f.row_id, f.id, f.public_id, f.user_id, pr.username, pr.display_name,
         public.community_badge(f.user_id) as badge,
         f.reblogged_by,
         f.type, f.body, f.images, f.youtube_id, f.poll,
         f.up_count, f.down_count, f.score, f.reply_count, f.reblog_count,
         f.reblog_of, f.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked,
         exists (select 1 from public.community_posts rb
                 where rb.reblog_of = f.id and rb.user_id = auth.uid()) as viewer_reblogged,
         f.bookmark_count, pr.avatar_url,
         f.meta, f.tags,
         -- Populated only for a quote (this row IS the reblog and has a body).
         q.public_id, qpr.username, q.body, q.type, q.images, q.created_at
  from filtered f
  join public.profiles pr on pr.id = f.user_id
  left join public.community_votes     v on v.post_id = f.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = f.id and b.user_id = auth.uid()
  left join public.community_posts     q on q.id = f.reblog_of and f.body is not null
                                        and not q.hidden
  left join public.profiles         qpr on qpr.id = q.user_id
  order by
    case when p_sort = 'new' then extract(epoch from f.row_created_at) end desc nulls last,
    case when p_sort = 'top' then f.score end desc nulls last,
    -- HOT IS A SEEDED SHUFFLE (§1). The old formula was
    -- sign(score)*log(...) + epoch/45000; with downvotes gone score is 0 on
    -- nearly every row, so the vote term was always 0 and Hot was New with
    -- extra arithmetic. hashtext((row_id, seed)) is deterministic for a seed,
    -- so limit/offset paging never duplicates or skips a card, and a fresh seed
    -- per visit re-orders the archive. Posts under 2 days old get a constant
    -- bump toward the front, still shuffled among themselves.
    case when p_sort = 'hot' then
      hashtext(f.row_id::text || p_seed::text)::bigint
      - case when f.row_created_at > now() - interval '2 days' then 1500000000 else 0 end
    end asc nulls last,
    case when p_sort = 'controversial' then
      power(greatest(f.up_count + f.down_count, 1),
            least(f.up_count, f.down_count)::numeric / greatest(f.up_count, f.down_count, 1))
    end desc nulls last,
    f.row_created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_feed(text, text, int, int, text, boolean, boolean, boolean, int, boolean, text) to anon, authenticated;
