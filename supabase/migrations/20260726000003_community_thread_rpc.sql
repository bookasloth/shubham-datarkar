-- =====================================================================
-- Build-in-public spine: hydrate a thread's notes as full feed cards.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- Isolated from community_feed on purpose: a thread is the owner's own text
-- notes, oldest → newest, no sort/shuffle/viewer-filter machinery. Mirrors
-- community_post's hydration (votes/bookmarks/quoted/thread/version) but returns
-- MANY rows filtered by thread. Same OUT columns as community_post so the client
-- maps it with the shared mapRow.
--
-- Depends on 20260726000002 (community_post shape) + 20260726000001 (thread col).
-- =====================================================================

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
    and not p.hidden
    and not pr.banned
    and p.publish_at is not null and p.publish_at <= now()
  order by p.created_at asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_thread(text, int, int) to anon, authenticated;
