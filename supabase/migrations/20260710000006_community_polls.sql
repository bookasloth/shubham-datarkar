-- =====================================================================
-- /community — poll tallies. Batched: one call per page, not per poll.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001.
-- Viewer identity is auth.uid() — never a parameter.
-- =====================================================================

create or replace function public.community_poll_results_many(p_posts uuid[])
returns table (post_id uuid, option_index int, votes int, viewer_choice boolean)
language sql stable security definer set search_path = public as $$
  select v.post_id,
         v.option_index,
         count(*)::int                   as votes,
         bool_or(v.user_id = auth.uid()) as viewer_choice
  from public.community_poll_votes v
  where v.post_id = any(p_posts)
  group by v.post_id, v.option_index;
$$;

grant execute on function public.community_poll_results_many(uuid[]) to anon, authenticated;
