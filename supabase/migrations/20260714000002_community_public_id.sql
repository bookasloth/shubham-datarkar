-- =====================================================================
-- /community — public_id: human-friendly permalink key (YYYY + global seq).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- The internal UUID (community_posts.id) stays the PK and every FK target
-- (votes / poll_votes / bookmarks / reports / replies / reblogs). public_id is
-- ROUTING + DISPLAY only — nothing relational depends on it. That is what keeps
-- likes, comments, bookmarks, notifications, analytics, search untouched.
--
-- Format: bigint = extract(year from created_at)*100000000 + global_sequence.
--   2026, seq 1     -> 202600000001
--   2027, seq 12346 -> 202700012346   (the sequence is GLOBAL — never resets)
-- The 8-digit sequence band holds ~100M posts before the year prefix would
-- collide; astronomically far for this community. If it ever nears that, widen
-- the band (e.g. *1e10) in a follow-up migration.
--
-- Depends on 20260710000001 (schema) + 20260710000005 (post/replies RPCs)
--          + 20260711000003 (8-arg feed RPC).
-- =====================================================================

-- ---------- global monotonic sequence (shared across all years) ----------
create sequence if not exists public.community_public_seq;

-- ---------- new column (nullable until backfilled) ----------
alter table public.community_posts add column if not exists public_id bigint;

-- ---------- backfill: older post = lower sequence number ----------
-- row_number() (NOT per-row nextval) guarantees created_at ordering; the setval
-- below then parks the sequence at the high-water mark so future inserts follow.
-- Every row is given a public_id (roots, replies, reblog rows alike) so any row
-- resolves by its permalink; only the sequence numbers differ.
with ordered as (
  select id,
         extract(year from created_at)::bigint        as yr,
         row_number() over (order by created_at, id)  as rn
  from public.community_posts
  where public_id is null
)
update public.community_posts p
   set public_id = o.yr * 100000000 + o.rn
  from ordered o
 where p.id = o.id;

-- Park the sequence. GREATEST(current position, data high-water) so a re-run can
-- never rewind below values a live insert already issued (no collisions).
select setval(
  'public.community_public_seq',
  greatest(
    (select last_value from public.community_public_seq),
    (select coalesce(max(public_id) % 100000000, 1) from public.community_posts)
  ),
  true
);

-- ---------- assign on every future insert ----------
create or replace function public.community_assign_public_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.public_id is null then
    new.public_id := extract(year from coalesce(new.created_at, now()))::bigint * 100000000
                     + nextval('public.community_public_seq');
  end if;
  return new;
end $$;

drop trigger if exists community_posts_public_id on public.community_posts;
create trigger community_posts_public_id
  before insert on public.community_posts
  for each row execute function public.community_assign_public_id();

-- ---------- lock it down: unique + not null (trigger fills all future rows) ----------
create unique index if not exists community_posts_public_id_key
  on public.community_posts (public_id);
alter table public.community_posts alter column public_id set not null;

-- =====================================================================
-- RPCs: surface public_id. Adding a column to a RETURNS TABLE (and changing
-- community_post's arg type) needs DROP first — CREATE OR REPLACE cannot alter
-- an existing function's signature.
-- =====================================================================

drop function if exists public.community_feed(text, text, int, int, text, boolean, boolean, boolean);
drop function if exists public.community_post(uuid);
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
  viewer_vote smallint, viewer_bookmarked boolean, viewer_reblogged boolean
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
           p.up_count, p.down_count, p.reply_count, p.reblog_count,
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
                 where rb.reblog_of = f.id and rb.user_id = auth.uid()) as viewer_reblogged
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
  where p.parent_id = p_post and not p.hidden and not pr.banned
  order by p.created_at asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_replies(uuid, int, int) to anon, authenticated;
