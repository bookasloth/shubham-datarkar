-- =====================================================================
-- /community — fix: bookmark_count stuck at 0 on other people's posts.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- community_bookmark_counts() (from 20260714000004) was declared WITHOUT
-- `security definer`, unlike the vote/reply/reblog counter functions. It runs as
-- the invoker, so when a user bookmarks a post they don't own, the trigger's
--   update community_posts set bookmark_count = bookmark_count + 1 where id = ...
-- is filtered out by the community_posts UPDATE RLS policy (owner/admin only):
-- 0 rows updated, no error, the bookmark row still inserts, and the count stays
-- 0. Self-bookmarks (you own the post) updated fine — which is why some counts
-- read 1 while others' posts read 0.
--
-- Fix: recreate the function as SECURITY DEFINER (matching the other counters),
-- then resync bookmark_count from the actual community_bookmarks rows to repair
-- the counts that drifted while the trigger was a no-op.
-- =====================================================================

create or replace function public.community_bookmark_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- The trigger already points at this function by name, so create-or-replace keeps
-- it bound — no need to recreate the trigger.

-- Resync every post's counter to the true number of bookmark rows (repairs both
-- the under-counts from the bug and any that were already correct — a no-op then).
update public.community_posts p
   set bookmark_count = coalesce(c.n, 0)
  from (
    select post_id, count(*)::int as n
    from public.community_bookmarks
    group by post_id
  ) c
 where c.post_id = p.id
   and p.bookmark_count is distinct from c.n;

-- Posts whose every bookmark was removed while the counter was stuck also need a
-- reset to 0 (the join above only touches posts that still have bookmark rows).
update public.community_posts p
   set bookmark_count = 0
 where p.bookmark_count <> 0
   and not exists (select 1 from public.community_bookmarks b where b.post_id = p.id);
