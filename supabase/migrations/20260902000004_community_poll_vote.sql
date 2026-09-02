-- =====================================================================
-- /community — P0: enforce poll rules in the DB, not just the server action.
-- Target: OWN Supabase. Apply MANUALLY. Idempotent.
--
-- WHY
-- Poll close / valid-option / is-a-poll were checked only inside voteOnPoll().
-- community_poll_votes had an identity-only RLS policy, so a raw PostgREST
-- insert could vote on a closed poll, for a non-existent option, or on a post
-- that isn't a poll at all. Any tally was therefore unverifiable.
--
-- Fix: a security-definer RPC that performs the checks, and REVOKE direct
-- insert/update/delete on the table from anon/authenticated so the RPC is the
-- only write path. Reads stay (RLS self-select) though the client doesn't use
-- them — tallies come from community_poll_results_many.
--
-- Depends on 20260710000001 (community_poll_votes) + 20260710000006 (poll shape).
-- =====================================================================

-- ---------- the only write path ----------
create or replace function public.community_poll_vote(p_post uuid, p_option int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_post   record;
  v_closes timestamptz;
begin
  if v_uid is null then return 'signed_out'; end if;

  select type, poll, hidden, publish_at
    into v_post
    from public.community_posts
   where id = p_post;

  if not found or v_post.type <> 'poll' or v_post.poll is null or v_post.hidden then
    return 'not_poll';
  end if;

  -- A draft or scheduled poll isn't open yet.
  if v_post.publish_at is null or v_post.publish_at > now() then
    return 'draft';
  end if;

  -- Option must exist in this poll (poll = {options:[{i,label}], closes_at}).
  if not exists (
    select 1 from jsonb_array_elements(v_post.poll->'options') o
     where (o->>'i')::int = p_option
  ) then
    return 'unknown_option';
  end if;

  v_closes := (v_post.poll->>'closes_at')::timestamptz;
  if v_closes is not null and v_closes <= now() then
    return 'closed';
  end if;

  insert into public.community_poll_votes (post_id, user_id, option_index)
       values (p_post, v_uid, p_option)
  on conflict (post_id, user_id) do nothing;

  -- ON CONFLICT DO NOTHING → 0 rows when the user already voted.
  if not found then return 'already'; end if;
  return 'ok';
end $$;

revoke all on function public.community_poll_vote(uuid, int) from anon;
grant execute on function public.community_poll_vote(uuid, int) to authenticated;

-- ---------- close the direct write path ----------
-- The RLS policy `community_poll_votes_self FOR ALL` still exists, but revoking
-- the table privilege overrides it: no INSERT privilege = no insert, regardless
-- of policy. The definer RPC above runs as owner and is unaffected.
revoke insert, update, delete on public.community_poll_votes from anon, authenticated;
