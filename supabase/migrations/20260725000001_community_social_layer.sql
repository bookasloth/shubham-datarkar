-- =====================================================================
-- /community — the ONE signature migration for the social-layer spec.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- WHY EVERYTHING IS IN ONE FILE
-- `create or replace function` cannot change a function's OUT columns or its
-- signature. Every remaining feature in docs/COMMUNITY-SOCIAL-SPEC.md needs one
-- or the other on the SAME three functions, so batching them means one drop +
-- recreate to review and one manual SQL run instead of six.
--
-- After this lands, PRs B–F are pure application code.
--
-- WHAT CHANGES
--   community_posts   + meta jsonb, tags text[], publish_at, audience
--                     + type check widened to quote / link / chat
--   community_follows new table (empty; §2 wires the UI)
--   community_mutes   new table (empty; §3 wires the UI)
--   community_feed    + p_seed / p_following / p_tag params
--                     + meta / tags / quoted_* output columns
--                     + mute, audience and publish_at filters
--                     ~ 'hot' becomes a seeded shuffle (§1 — the only behaviour
--                       change that ships in this PR)
--   community_replies + depth output column, recursive to depth 3
--   community_post    + meta / tags / quoted_* output columns
--
-- PostgREST resolves an RPC by exact key set. Every new param has a DEFAULT, so
-- existing callers that send the old key set still resolve; new params are sent
-- only when non-default (see listFeed).
--
-- Depends on 20260718000002_community_avatar_url.sql (the bodies below are that
-- file's, plus the changes listed above).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------

-- One jsonb for every optional, type-scoped composer field (title, quote
-- source, link url + unfurl, place). Six nullable columns for values that never
-- co-occur buys nothing over this, and images/poll already set the precedent.
alter table public.community_posts add column if not exists meta jsonb;

alter table public.community_posts add column if not exists tags text[];

-- null = draft, future = scheduled, past = live. The feed filters on it, so a
-- scheduled post becomes visible when the clock passes it — no cron job.
alter table public.community_posts
  add column if not exists publish_at timestamptz default now();
update public.community_posts set publish_at = created_at where publish_at is null;

alter table public.community_posts
  add column if not exists audience text not null default 'everyone';
do $$ begin
  alter table public.community_posts
    add constraint community_posts_audience_chk check (audience in ('everyone','followers'));
exception when duplicate_object then null; end $$;

-- Widen the type check for the Quote / Link / Chat post types (§7). A GIF is a
-- photo whose file is a .gif, so it is deliberately NOT a type.
alter table public.community_posts drop constraint if exists community_posts_type_check;
alter table public.community_posts
  add constraint community_posts_type_check
  check (type in ('text','image','poll','youtube','quote','link','chat'));

-- Feed reads filter on publish_at; the partial index keeps the common path
-- (live root posts, newest first) index-only.
create index if not exists community_posts_live_idx
  on public.community_posts (publish_at desc)
  where parent_id is null and reblog_of is null and publish_at is not null;

create index if not exists community_posts_tags_idx
  on public.community_posts using gin (tags);

-- ---------------------------------------------------------------------
-- 2. Follows + mutes (§2, §3) — tables only; actions and UI land in PR B
-- ---------------------------------------------------------------------

create table if not exists public.community_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);
create index if not exists community_follows_followee_idx
  on public.community_follows(followee_id);

alter table public.community_follows enable row level security;
do $$ begin
  -- Follows are public: counts are shown on every profile.
  create policy follows_read   on public.community_follows for select using (true);
  create policy follows_insert on public.community_follows for insert with check (follower_id = auth.uid());
  create policy follows_delete on public.community_follows for delete using (follower_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.community_mutes (
  muter_id   uuid not null references public.profiles(id) on delete cascade,
  muted_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint no_self_mute check (muter_id <> muted_id)
);

alter table public.community_mutes enable row level security;
do $$ begin
  -- PRIVATE, unlike follows: a muted user must not be able to discover they are
  -- muted, so there is no public read policy.
  create policy mutes_rw on public.community_mutes for all
    using (muter_id = auth.uid()) with check (muter_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 3. RPCs — drop + recreate
-- ---------------------------------------------------------------------

drop function if exists public.community_feed(text, text, int, int, text, boolean, boolean, boolean);
drop function if exists public.community_post(bigint);
drop function if exists public.community_replies(uuid, int, int);

-- ---------- feed ----------
create function public.community_feed(
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
      hashtext(f.row_id::text || p_seed::text)
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

-- ---------- single post, resolved by public_id ----------
create function public.community_post(p_public bigint)
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
         q.public_id, qpr.username, q.body, q.type, q.images, q.created_at
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  left join public.community_posts     q on q.id = p.reblog_of and p.body is not null
                                        and not q.hidden
  left join public.profiles         qpr on qpr.id = q.user_id
  where p.public_id = p_public and not p.hidden and not pr.banned
    -- A permalink is NOT mute-filtered (mute quiets the feed; it doesn't erase
    -- what you navigated to on purpose) but a draft/scheduled post is private
    -- to its author until it is due.
    and (p.publish_at is not null and p.publish_at <= now() or p.user_id = auth.uid());
$$;

grant execute on function public.community_post(bigint) to anon, authenticated;

-- ---------- replies (recursive to depth 3) ----------
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
  where not p.hidden and not pr.banned
    and p.publish_at is not null and p.publish_at <= now()
    and not exists (select 1 from public.community_mutes m
                    where m.muter_id = auth.uid() and m.muted_id = p.user_id)
  order by t.path asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_replies(uuid, int, int) to anon, authenticated;
