-- =====================================================================
-- /community — F-16: one shared visibility predicate. Target: OWN Supabase.
-- Apply MANUALLY. Idempotent.
--
-- WHY
-- The "can this viewer see this post" rule (not hidden, publish due, author
-- active, audience) was hand-copied into the RLS policy AND five read RPCs
-- (feed, post, replies, thread, new_count). They had already drifted: the
-- permalink (community_post) and community_replies enforced NO audience check,
-- so a followers-only post/reply was readable by anyone via a permalink or
-- inside a thread. Every future change (e.g. soft-delete's deleted_at) would
-- have to be made correctly in six places.
--
-- FIX: community_visible_public(hidden, publish_at, author, audience) — the ONE
-- public-visibility predicate, called by the policy and every RPC. Passing the
-- columns (not a row type) lets the same function serve both the RLS policy
-- `using(...)` and each RPC's WHERE.
--
-- BEHAVIOUR CHANGES (both are fixes, both tightening):
--   * community_post permalink now enforces audience → a followers-only post is
--     no longer readable by a non-follower via its permalink (owner still sees
--     their own).
--   * community_replies now enforces audience → a followers-only reply is hidden
--     from non-followers, matching the feed.
-- Everything else is behaviour-identical: the inline conditions being replaced
-- were exactly this predicate.
--
-- The per-surface extras stay per-RPC (they are not visibility): mute
-- (feed/replies/new_count), demoted (feed ranking), the owner self-view on the
-- permalink, and new_count's exclude-own.
--
-- Depends on 20260902000001 (the functions this rewrites + community_author_active).
-- =====================================================================

-- ---------- the one predicate ----------
create or replace function public.community_visible_public(
  p_hidden     boolean,
  p_publish_at timestamptz,
  p_author     uuid,
  p_audience   text
) returns boolean
language sql stable security definer set search_path = public as $$
  select
    not p_hidden
    and p_publish_at is not null and p_publish_at <= now()   -- drafts + scheduled excluded
    and public.community_author_active(p_author)             -- banned / deactivated excluded
    and (
      p_audience = 'everyone'
      or p_author = auth.uid()                               -- your own followers-only posts
      or exists (select 1 from public.community_follows f
                 where f.follower_id = auth.uid() and f.followee_id = p_author)
    );
$$;
grant execute on function public.community_visible_public(boolean, timestamptz, uuid, text) to anon, authenticated;

-- ---------- RLS policy: admin OR owner OR the shared predicate ----------
-- Behaviour-identical to 20260902000001's policy; the inline block is now the
-- predicate. Owner still sees all their own rows (drafts/hidden included).
drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
  for select to anon, authenticated
  using (
    public.is_admin()
    or auth.uid() = user_id
    or public.community_visible_public(hidden, publish_at, user_id, audience)
  );

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
  quoted_images jsonb, quoted_created_at timestamptz,
  thread text, version text
)
language sql stable security definer set search_path = public as $$
  with rows_ as (
    select r.id                                as row_id,
           r.created_at                        as row_created_at,
           r.reblog_of,
           r.body                              as row_body,
           actor.username                      as actor_username,
           case when r.reblog_of is not null and r.body is null
                then coalesce(o.id, r.id) else r.id end as src_id
    from public.community_posts r
    join public.profiles actor on actor.id = r.user_id
    left join public.community_posts o on o.id = r.reblog_of
    where r.parent_id is null
      and public.community_visible_public(r.hidden, r.publish_at, r.user_id, r.audience)
      and (r.reblog_of is null or (o.id is not null and not o.hidden))
      and (p_author is null or lower(actor.username) = lower(p_author))
      and not exists (select 1 from public.community_mutes m
                      where m.muter_id = auth.uid() and m.muted_id = r.user_id)
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
           p.reblog_of, p.created_at, p.demoted, p.meta, p.tags, p.thread, p.version,
           (p.up_count - p.down_count) as score,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from rows_ rw
    join public.community_posts p on p.id = rw.src_id
    join public.profiles sa on sa.id = p.user_id
    where public.community_visible_public(p.hidden, p.publish_at, p.user_id, p.audience)
      and not exists (select 1 from public.community_mutes m2
                      where m2.muter_id = auth.uid() and m2.muted_id = p.user_id)
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
         q.public_id, qpr.username, q.body, q.type, q.images, q.created_at,
         f.thread, f.version
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

create or replace function public.community_post(p_public bigint)
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
  quoted_images jsonb, quoted_created_at timestamptz,
  thread text, version text
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
         p.bookmark_count, pr.avatar_url,
         p.meta, p.tags,
         q.public_id, qpr.username, q.body, q.type, q.images, q.created_at,
         p.thread, p.version
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  left join public.community_posts     q on q.id = p.reblog_of and p.body is not null
                                        and not q.hidden
  left join public.profiles         qpr on qpr.id = q.user_id
  where p.public_id = p_public
    and (public.community_visible_public(p.hidden, p.publish_at, p.user_id, p.audience)
         or p.user_id = auth.uid());
$$;

grant execute on function public.community_post(bigint) to anon, authenticated;

create or replace function public.community_replies(
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
  bookmark_count int, avatar_url text,
  meta jsonb, tags text[], depth int
)
language sql stable security definer set search_path = public as $$
  -- Depth is COMPUTED, never stored, so nothing needs backfilling and nothing
  -- can drift. `path` is what makes a thread render: ordering by it yields a
  -- pre-order traversal — every child directly under its parent — so the client
  -- indents by `depth` and never builds a tree.
  --
  -- The app still refuses to create a reply deeper than 1 until §5 lands; this
  -- query just stops being the thing that blocks it.
  --
  -- `not c.hidden` is inside the recursion, not only in the outer WHERE: a
  -- hidden reply must not carry its children into the result, or they render as
  -- orphans indented under nothing.
  with recursive t as (
    select c.id, c.parent_id, 1 as depth, array[c.created_at] as path
    from public.community_posts c
    where c.parent_id = p_post and not c.hidden
    union all
    select c.id, c.parent_id, t.depth + 1, t.path || c.created_at
    from public.community_posts c
    join t on c.parent_id = t.id
    where t.depth < 3 and not c.hidden
  )
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
         p.bookmark_count, pr.avatar_url,
         p.meta, p.tags, t.depth
  from t
  join public.community_posts p on p.id = t.id
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where public.community_visible_public(p.hidden, p.publish_at, p.user_id, p.audience)
    and not exists (select 1 from public.community_mutes m
                    where m.muter_id = auth.uid() and m.muted_id = p.user_id)
  order by t.path asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_replies(uuid, int, int) to anon, authenticated;

create or replace function public.community_thread(
  p_thread text,
  p_limit  int default 100,
  p_offset int default 0
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
  quoted_images jsonb, quoted_created_at timestamptz,
  thread text, version text
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
         p.bookmark_count, pr.avatar_url,
         p.meta, p.tags,
         q.public_id, qpr.username, q.body, q.type, q.images, q.created_at,
         p.thread, p.version
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  left join public.community_posts     q on q.id = p.reblog_of and p.body is not null
                                        and not q.hidden
  left join public.profiles         qpr on qpr.id = q.user_id
  where p.thread = p_thread
    and p.parent_id is null
    and public.community_visible_public(p.hidden, p.publish_at, p.user_id, p.audience)
  order by p.created_at asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_thread(text, int, int) to anon, authenticated;

create or replace function public.community_new_count(
  p_since     timestamptz,
  p_following boolean default false
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select least(count(*), 50)::int
  from public.community_posts r
  join public.profiles actor on actor.id = r.user_id
  where r.parent_id is null
    and r.created_at > p_since
    and r.user_id <> auth.uid()          -- never count your own
    and public.community_visible_public(r.hidden, r.publish_at, r.user_id, r.audience)
    and not exists (select 1 from public.community_mutes m
                    where m.muter_id = auth.uid() and m.muted_id = r.user_id)

    and (not p_following or exists (select 1 from public.community_follows f
                                    where f.follower_id = auth.uid()
                                      and f.followee_id = r.user_id));
$$;

-- authenticated only: a logged-out visitor gets the random preview, not a live
-- feed, so there is nothing to poll.
grant execute on function public.community_new_count(timestamptz, boolean) to authenticated;
