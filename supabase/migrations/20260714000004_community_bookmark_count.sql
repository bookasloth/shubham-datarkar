-- =====================================================================
-- /community — public bookmark_count (denormalized column + trigger).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- Bookmarks were viewer-private (RLS: users see only their own rows), so the
-- feed only exposed `viewer_bookmarked` (a boolean). This adds a PUBLIC tally
-- the same way up/down/reply/reblog work: a counter column on community_posts
-- kept in sync by a trigger on community_bookmarks. The individual bookmarkers
-- stay private — only the aggregate count is surfaced.
--
-- Depends on 20260714000002 (public_id RPCs) + 20260714000003 (uuid shim).
-- =====================================================================

-- ---------- counter column ----------
alter table public.community_posts
  add column if not exists bookmark_count int not null default 0;

-- ---------- backfill from existing bookmarks ----------
update public.community_posts p
   set bookmark_count = c.n
  from (select post_id, count(*) as n from public.community_bookmarks group by post_id) c
 where c.post_id = p.id
   and p.bookmark_count <> c.n;   -- no-op on a re-run once counts already match

-- ---------- keep bookmark_count in sync (toggle = insert / delete, never update) ----------
create or replace function public.community_bookmark_counts()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
       set bookmark_count = bookmark_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts
       set bookmark_count = greatest(0, bookmark_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists community_bookmarks_count on public.community_bookmarks;
create trigger community_bookmarks_count
  after insert or delete on public.community_bookmarks
  for each row execute function public.community_bookmark_counts();

-- =====================================================================
-- RPCs: surface bookmark_count. Adding a column to a RETURNS TABLE needs DROP
-- first — CREATE OR REPLACE cannot alter an existing function's OUT columns.
-- Bodies are copied verbatim from 20260714000002 with `bookmark_count` appended
-- as the final output column (kept last so every other position is unchanged).
-- The dormant community_post(uuid) shim (0003) is intentionally left as-is: no
-- current caller uses it and mapRow defaults a missing bookmark_count to 0.
-- =====================================================================

drop function if exists public.community_feed(text, text, int, int, text, boolean, boolean, boolean);
drop function if exists public.community_post(bigint);
drop function if exists public.community_replies(uuid, int, int);

-- ---------- feed (8-arg, viewer-scoped filters) ----------
create function public.community_feed(
  p_sort       text    default 'new',
  p_window     text    default 'all',
  p_limit      int     default 20,
  p_offset     int     default 0,
  p_author     text    default null,
  p_bookmarked boolean default false,
  p_reblogged  boolean default false,
  p_liked      boolean default false
)
returns table (
  row_id uuid, id uuid, public_id bigint, user_id uuid, username text, display_name text, badge text,
  reblogged_by text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean, viewer_reblogged boolean,
  bookmark_count int
)
language sql stable security definer set search_path = public as $$
  with rows_ as (
    select r.id                                as row_id,
           r.created_at                        as row_created_at,
           r.reblog_of,
           actor.username                      as actor_username,
           coalesce(o.id, r.id)                as src_id
    from public.community_posts r
    join public.profiles actor on actor.id = r.user_id
    left join public.community_posts o on o.id = r.reblog_of
    where r.parent_id is null
      and not r.hidden
      and not actor.banned
      and (r.reblog_of is null or (o.id is not null and not o.hidden))
      and (p_author is null or lower(actor.username) = lower(p_author))
  ),
  src as (
    select rw.row_id,
           rw.row_created_at,
           case when rw.reblog_of is not null then rw.actor_username end as reblogged_by,
           p.id, p.public_id, p.user_id, p.type, p.body, p.images, p.youtube_id, p.poll,
           p.up_count, p.down_count, p.reply_count, p.reblog_count, p.bookmark_count,
           p.reblog_of, p.created_at, p.demoted,
           (p.up_count - p.down_count) as score,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from rows_ rw
    join public.community_posts p on p.id = rw.src_id
    join public.profiles sa on sa.id = p.user_id
    where not p.hidden
      and not sa.banned
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
         f.bookmark_count
  from filtered f
  join public.profiles pr on pr.id = f.user_id
  left join public.community_votes     v on v.post_id = f.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = f.id and b.user_id = auth.uid()
  order by
    case when p_sort = 'new' then extract(epoch from f.row_created_at) end desc nulls last,
    case when p_sort = 'top' then f.score end desc nulls last,
    case when p_sort = 'hot' then
      sign(f.score) * log(greatest(abs(f.score), 1)) + extract(epoch from f.row_created_at) / 45000
    end desc nulls last,
    case when p_sort = 'controversial' then
      power(greatest(f.up_count + f.down_count, 1),
            least(f.up_count, f.down_count)::numeric / greatest(f.up_count, f.down_count, 1))
    end desc nulls last,
    f.row_created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_feed(text, text, int, int, text, boolean, boolean, boolean) to anon, authenticated;

-- ---------- single post, resolved by public_id ----------
create function public.community_post(p_public bigint)
returns table (
  row_id uuid, id uuid, public_id bigint, user_id uuid, username text, display_name text, badge text,
  reblogged_by text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean, viewer_reblogged boolean,
  bookmark_count int
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
                 where rb.reblog_of = p.id and rb.user_id = auth.uid()) as viewer_reblogged,
         p.bookmark_count
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.public_id = p_public and not p.hidden and not pr.banned;
$$;

grant execute on function public.community_post(bigint) to anon, authenticated;

-- ---------- replies to a post (parent keyed by UUID, unchanged) ----------
create function public.community_replies(
  p_post   uuid,
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  row_id uuid, id uuid, public_id bigint, user_id uuid, username text, display_name text, badge text,
  reblogged_by text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean, viewer_reblogged boolean,
  bookmark_count int
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
                 where rb.reblog_of = p.id and rb.user_id = auth.uid()) as viewer_reblogged,
         p.bookmark_count
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.parent_id = p_post and not p.hidden and not pr.banned
  order by p.created_at asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_replies(uuid, int, int) to anon, authenticated;
