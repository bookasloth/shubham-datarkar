-- =============================================================
--  Leaderboard forgery: the submit RPCs trusted the caller.
--
--  submit_result / submit_archive_result are `security definer`, derived the
--  player from auth.uid(), and were reachable over PostgREST by any
--  authenticated JWT (submit_result via an explicit grant; submit_archive_result
--  via the default PUBLIC execute grant). The only check that the guesses ACTUALLY
--  solve the puzzle lives in the Next.js server action (validateResult), which a
--  direct REST call skips entirely.
--
--  So any logged-in user could POST /rest/v1/rpc/submit_result with
--  { p_status:'won', p_guesses:1, ... } and forge a guess-1 win for any puzzle:
--  top the daily board (ranked by fewest guesses), build an unbroken streak,
--  and (via the archive RPC) forge Solved + fastest-time across the back catalogue.
--
--  Fix: the write path is now trusted-server-only. Both functions take the player
--  as an explicit `p_user` and are granted to `service_role` only — no anon/
--  authenticated execute. The server action (submit-result.ts) validates the
--  solve, then calls these via the service-role client, passing the authenticated
--  user's id. There is no longer a PostgREST-reachable write path, so the
--  app-layer validation can no longer be bypassed.
--
--  Deploy note: this changes the function signature (adds p_user, drops the
--  vestigial p_time_ms). Run this migration and redeploy the app together — in
--  the gap, in-flight submits resolve to a signature that doesn't exist and fail
--  (boards simply don't record for that window; nothing is corrupted).
-- =============================================================

-- Old signatures gone entirely, so no PostgREST-reachable overload remains.
drop function if exists public.submit_result(game_key, int, date, result_status, int, jsonb, int);
drop function if exists public.submit_archive_result(game_key, int, date, result_status, int, jsonb, int);

-- ---------- daily write path (touches streaks) ----------
-- Body is the idempotent version from 20260717000001: a finished row is frozen,
-- and the streak block only runs on the in_progress -> won/lost transition.
-- Only change vs. that version: v_user comes from the trusted p_user, not auth.uid().
create function public.submit_result(
  p_user       uuid,
  p_game       game_key,
  p_puzzle     int,
  p_date       date,
  p_status     result_status,
  p_guesses    int,
  p_guess_data jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := p_user;
  v_started timestamptz;
  v_time_ms int;
  v_written int;
  v_last int;
  v_cur  int;
  v_max  int;
begin
  if v_user is null then raise exception 'no user'; end if;

  select started_at into v_started
    from public.game_results
    where user_id = v_user and game = p_game and puzzle_number = p_puzzle;
  v_time_ms := public.elapsed_ms(v_started);

  insert into public.game_results
    (user_id, game, puzzle_number, puzzle_date, status, guesses, guess_data, time_ms, completed_at, updated_at, source)
  values
    (v_user, p_game, p_puzzle, p_date, p_status, p_guesses, p_guess_data, v_time_ms,
     case when p_status <> 'in_progress' then now() end, now(), 'daily')
  on conflict (user_id, game, puzzle_number) do update
    set status = excluded.status,
        guesses = excluded.guesses,
        guess_data = excluded.guess_data,
        time_ms = excluded.time_ms,
        completed_at = excluded.completed_at,
        updated_at = now()
    where public.game_results.status = 'in_progress'
  returning 1 into v_written;

  if not found then return; end if;
  if p_status = 'in_progress' then return; end if;

  insert into public.streaks (user_id, game) values (v_user, p_game)
    on conflict do nothing;

  select current_streak, max_streak, last_solved_puzzle
    into v_cur, v_max, v_last
    from public.streaks where user_id = v_user and game = p_game for update;

  if p_status = 'won' then
    v_cur := case when v_last = p_puzzle - 1 then v_cur + 1 else 1 end;
    v_max := greatest(v_max, v_cur);
    update public.streaks set
      current_streak = v_cur, max_streak = v_max, last_solved_puzzle = p_puzzle,
      total_played = total_played + 1, total_won = total_won + 1
      where user_id = v_user and game = p_game;
  else -- lost
    update public.streaks set
      current_streak = 0, total_played = total_played + 1
      where user_id = v_user and game = p_game;
  end if;
end; $$;

-- ---------- archive write path (never touches streaks) ----------
-- Body is the version from 20260716000002; v_user from p_user, not auth.uid().
create function public.submit_archive_result(
  p_user       uuid,
  p_game       game_key,
  p_puzzle     int,
  p_date       date,
  p_status     result_status,
  p_guesses    int,
  p_guess_data jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := p_user;
  v_started timestamptz;
  v_time_ms int;
begin
  if v_user is null then raise exception 'no user'; end if;
  if p_status = 'in_progress' then return; end if;

  select started_at into v_started
    from public.game_results
    where user_id = v_user and game = p_game and puzzle_number = p_puzzle;
  v_time_ms := public.elapsed_ms(v_started);

  insert into public.game_results
    (user_id, game, puzzle_number, puzzle_date, status, guesses, guess_data, time_ms,
     completed_at, updated_at, source)
  values
    (v_user, p_game, p_puzzle, p_date, p_status, p_guesses, p_guess_data, v_time_ms,
     now(), now(), 'archive')
  on conflict (user_id, game, puzzle_number) do update
    set status       = excluded.status,
        guesses      = excluded.guesses,
        guess_data   = excluded.guess_data,
        time_ms      = excluded.time_ms,
        completed_at = excluded.completed_at,
        updated_at   = now(),
        source       = excluded.source
    where public.game_results.status <> 'won';
end; $$;

-- Trusted-server-only. No anon/authenticated execute on either write path.
revoke all on function public.submit_result(uuid, game_key, int, date, result_status, int, jsonb) from public, anon, authenticated;
revoke all on function public.submit_archive_result(uuid, game_key, int, date, result_status, int, jsonb) from public, anon, authenticated;
grant execute on function public.submit_result(uuid, game_key, int, date, result_status, int, jsonb) to service_role;
grant execute on function public.submit_archive_result(uuid, game_key, int, date, result_status, int, jsonb) to service_role;
