-- =============================================================
--  Avg Solve Time — actually measure it.
--
--  `time_ms` has always existed and has always been null: every board passes
--  timeMs: null, so the Avg Solve Time tile could only ever render "—".
--
--  It is NOT a cosmetic column. get_daily_board ranks:
--      order by r.guesses asc, r.time_ms asc nulls last
--  so time_ms is the tiebreak between players on equal guesses. Letting the
--  client supply it would mean anyone could POST time_ms = 1 and top the board.
--  So the server holds the stopwatch: the client says WHEN it started (once,
--  unforgeably-ish) and the server does the arithmetic.
--
--  Clock starts on the player's FIRST GUESS, not on page open — otherwise a tab
--  left open overnight records an 8-hour solve and poisons the average.
-- =============================================================

alter table public.game_results
  add column if not exists started_at timestamptz;

comment on column public.game_results.started_at is
  'Server clock at the player''s first guess. time_ms is derived from this on submit; the client never supplies a duration.';

-- ---------- start the clock ----------
-- `on conflict do nothing` is the whole anti-cheat: the row can only ever be
-- stamped once, so re-calling this right before submitting cannot rewind the
-- clock, and it can never disturb an already-finished puzzle.
create or replace function public.start_puzzle(
  p_game   game_key,
  p_puzzle int,
  p_date   date
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  insert into public.game_results
    (user_id, game, puzzle_number, puzzle_date, status, guesses, started_at, updated_at)
  values
    (v_user, p_game, p_puzzle, p_date, 'in_progress', 0, now(), now())
  on conflict (user_id, game, puzzle_number) do nothing;
end; $$;

-- ---------- shared derivation ----------
-- Null when the clock never started (rows predating this migration, or a solve
-- that raced the start call). A run longer than 6h is an abandoned tab, not a
-- solve time — recorded as null so it can neither win a tiebreak nor drag an
-- average.
-- STABLE, not IMMUTABLE: it reads now(). Declaring it immutable would license the
-- planner to fold the call to a constant.
create or replace function public.elapsed_ms(p_started timestamptz)
returns int language sql stable set search_path = public as $$
  select case
    when p_started is null then null
    when extract(epoch from (now() - p_started)) < 0 then null
    when extract(epoch from (now() - p_started)) > 6 * 60 * 60 then null
    else (extract(epoch from (now() - p_started)) * 1000)::int
  end;
$$;

-- ---------- ignore the client's time_ms on both write paths ----------
-- `p_time_ms` is KEPT and deliberately ignored — a rollout concern, not
-- indecision. Dropping it would change the signature, and there is always a
-- window where the running site and the database disagree: whichever lands
-- first, the other one's calls resolve to a function that doesn't exist
-- (PGRST202) and every result submission fails until the deploy catches up.
-- Keeping the parameter means the old and new code both call the same function.
--
-- The DEFAULT is decoration: verified against prod that PostgREST resolves an
-- overload by the exact set of keys POSTed, so omitting p_time_ms 404s anyway
-- despite the default. Callers must pass it explicitly (submit-result.ts does,
-- as null). Follow-up: drop the parameter and its call-site once no old code
-- can call it.
create or replace function public.submit_result(
  p_game       game_key,
  p_puzzle     int,
  p_date       date,
  p_status     result_status,
  p_guesses    int,
  p_guess_data jsonb,
  p_time_ms    int default null  -- ignored; the server derives the time
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_started timestamptz;
  v_time_ms int;
  v_last int;
  v_cur  int;
  v_max  int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

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
        updated_at = now();
        -- started_at deliberately absent: the clock is set once, by start_puzzle.

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

create or replace function public.submit_archive_result(
  p_game       game_key,
  p_puzzle     int,
  p_date       date,
  p_status     result_status,
  p_guesses    int,
  p_guess_data jsonb,
  p_time_ms    int default null  -- ignored; the server derives the time
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_started timestamptz;
  v_time_ms int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
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
