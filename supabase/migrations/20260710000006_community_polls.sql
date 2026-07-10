-- =====================================================================
-- /community — poll tallies + poll-vote integrity guard.
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

-- ---------------------------------------------------------------------
-- The app's checks in voteOnPoll are UX, not a trust boundary: RLS on
-- community_poll_votes is self-only, so any authenticated user can POST
-- straight to PostgREST with option_index = 999, or vote after the poll
-- closed. That inflates the tally's total and deflates every real option's
-- percentage. Enforce the invariants where they cannot be bypassed.
-- ---------------------------------------------------------------------
create or replace function public.community_poll_vote_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type text;
  v_poll jsonb;
begin
  select p.type, p.poll into v_type, v_poll
  from public.community_posts p
  where p.id = new.post_id;

  if v_type is distinct from 'poll' or v_poll is null then
    raise exception 'not a poll';
  end if;

  if (v_poll ->> 'closes_at') is not null
     and (v_poll ->> 'closes_at')::timestamptz <= now() then
    raise exception 'poll closed';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_poll -> 'options') o
    where (o ->> 'i')::int = new.option_index
  ) then
    raise exception 'unknown poll option';
  end if;

  return new;
end $$;

drop trigger if exists community_poll_votes_guard on public.community_poll_votes;
create trigger community_poll_votes_guard
  before insert on public.community_poll_votes
  for each row execute function public.community_poll_vote_guard();
