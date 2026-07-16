-- =============================================================
--  Streaks reset to 1 when you REVISIT a puzzle you already solved.
--
--  Every board restores its finished state from localStorage on mount and then
--  fires submitResult again (the `submitted` ref is per-mount, so it only
--  de-dupes within a single page view). submit_result happily ran its streak
--  block a second time:
--
--      v_cur := case when v_last = p_puzzle - 1 then v_cur + 1 else 1 end;
--
--  On the re-submit, last_solved_puzzle is ALREADY p_puzzle, so continuity fails
--  and the else branch fires: a 3-day streak becomes 1. total_played/total_won
--  also climbed by one per revisit, and time_ms was re-derived from started_at,
--  so a solve looked slower every time the player opened the page.
--
--  Fixed here, in the RPC, rather than in each board: all three boards
--  (Alfazy, Hit and Blow, Integra) route through this one function, and a server
--  action is a public endpoint anyway — a client-side guard is UX, not a rule.
--
--  The rule: a completed puzzle is FINAL. Writes only ever move a row from
--  in_progress to won/lost, and streaks only move on that one transition.
-- =============================================================

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
  v_written int;
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
        updated_at = now()
    -- The whole fix. A finished row is frozen: the re-submit on every page load
    -- of a solved puzzle matches no rows, so it cannot rewrite time_ms and,
    -- because FOUND goes false below, cannot reach the streak block either.
    where public.game_results.status = 'in_progress'
  returning 1 into v_written;

  -- Nothing written => the puzzle was already finished => already counted.
  -- Checked via FOUND rather than a prior SELECT so two concurrent submits
  -- cannot both decide they are the first one.
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

-- =============================================================
--  Repair the damage.
--
--  public.streaks is a denormalized aggregate, and the bug above has been
--  corrupting it on every revisit since launch: streaks truncated to 1, and
--  total_played/total_won inflated. game_results is the source of truth and is
--  intact (one row per user/game/puzzle, enforced by a unique constraint), so
--  every column is recomputable from it.
--
--  Only source = 'daily' rows count: submit_archive_result never touched
--  streaks, so archive solves must not appear in these totals either.
--
--  Streak length is gaps-and-islands: consecutive won puzzle_numbers share a
--  constant (puzzle_number - row_number()), so each island is one streak.
-- =============================================================

with daily as (
  select user_id, game, puzzle_number, status
    from public.game_results
   where source = 'daily' and status <> 'in_progress'
),
wins as (
  select user_id, game, puzzle_number,
         puzzle_number - row_number() over (
           partition by user_id, game order by puzzle_number
         ) as island
    from daily
   where status = 'won'
),
runs as (
  select user_id, game, island, count(*) as len, max(puzzle_number) as last_puzzle
    from wins
   group by user_id, game, island
),
best as (
  select user_id, game, max(len) as max_streak, max(last_puzzle) as last_won
    from runs
   group by user_id, game
),
-- The live streak is the island ending at the most recent win — earlier islands
-- are history and belong to max_streak only.
curr as (
  select r.user_id, r.game, r.len
    from runs r
    join best b on b.user_id = r.user_id and b.game = r.game
   where r.last_puzzle = b.last_won
),
totals as (
  select user_id, game,
         count(*) as played,
         count(*) filter (where status = 'won') as won,
         max(puzzle_number) as last_completed
    from daily
   group by user_id, game
)
update public.streaks s
   set total_played       = t.played,
       total_won          = t.won,
       max_streak         = coalesce(b.max_streak, 0),
       last_solved_puzzle = b.last_won,
       -- A loss after the last win breaks the streak, matching the 'lost' branch
       -- above which zeroes it.
       current_streak     = case
                              when b.last_won is null then 0
                              when t.last_completed > b.last_won then 0
                              else coalesce(c.len, 0)
                            end
  from totals t
  left join best b on b.user_id = t.user_id and b.game = t.game
  left join curr c on c.user_id = t.user_id and c.game = t.game
 where s.user_id = t.user_id and s.game = t.game;

-- Streak rows whose player has no completed daily result at all (their plays
-- were archive-only, or were wiped by the 20260715 reset). The UPDATE above
-- joins them away, so they would keep serving pre-reset numbers forever.
update public.streaks s
   set current_streak = 0, max_streak = 0, last_solved_puzzle = null,
       total_played = 0, total_won = 0
 where not exists (
   select 1 from public.game_results r
    where r.user_id = s.user_id and r.game = s.game
      and r.source = 'daily' and r.status <> 'in_progress'
 );
