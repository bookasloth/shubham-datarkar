-- =============================================================
--  Archive solves count as Solved.
--
--  Problem: `submit_result` is streak-coupled — the same call that writes the
--  result row also bumps current_streak/last_solved_puzzle/total_*. That is why
--  archive replays were blocked outright (client `isArchive` guard + the
--  `isToday` check in validate-result.ts): there was no way to record an archive
--  win without also farming a streak. So a puzzle solved with a membership never
--  produced a game_results row, and the archive grid — which derives Solved from
--  `game_results.status = 'won'` — could never show it.
--
--  Fix: a second write path that records the row and touches NOTHING else.
--  Streaks and Win Rate stay daily-only and un-gameable; Solved and Puzzles
--  Solved become honest.
-- =============================================================

-- ---------- 1. where a result came from ----------
-- Existing rows are all daily by construction: archive submits were rejected
-- server-side, so nothing else could have written one.
alter table public.game_results
  add column if not exists source text not null default 'daily';

do $$ begin
  alter table public.game_results
    add constraint game_results_source_check check (source in ('daily', 'archive'));
exception when duplicate_object then null; end $$;

comment on column public.game_results.source is
  'daily = played on its own day (counts toward streaks). archive = replayed later (never touches streaks).';

-- ---------- 2. the archive write path ----------
-- Deliberately NOT a flag on submit_result: keeping them as two functions means
-- the streak-writing branch is unreachable from the archive path by construction,
-- rather than by an argument the caller has to get right.
create or replace function public.submit_archive_result(
  p_game       game_key,
  p_puzzle     int,
  p_date       date,
  p_status     result_status,
  p_guesses    int,
  p_guess_data jsonb,
  p_time_ms    int
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_status = 'in_progress' then return; end if;

  insert into public.game_results
    (user_id, game, puzzle_number, puzzle_date, status, guesses, guess_data, time_ms,
     completed_at, updated_at, source)
  values
    (v_user, p_game, p_puzzle, p_date, p_status, p_guesses, p_guess_data, p_time_ms,
     now(), now(), 'archive')
  on conflict (user_id, game, puzzle_number) do update
    set status       = excluded.status,
        guesses      = excluded.guesses,
        guess_data   = excluded.guess_data,
        time_ms      = excluded.time_ms,
        completed_at = excluded.completed_at,
        updated_at   = now(),
        source       = excluded.source
    -- Never clobber a win. A puzzle already won (on its own day, or earlier from
    -- the archive) is settled history; a later replay must not downgrade it to a
    -- loss or rewrite whose day it belonged to.
    where public.game_results.status <> 'won';
end; $$;

-- ---------- 3. close the direct-write hole on game_results ----------
-- The old "results: own" policy was `for all` with `with check (auth.uid() =
-- user_id)`, so any signed-in user could PostgREST-insert their own rows
-- directly — forging wins for any puzzle and inflating the daily/period
-- leaderboards, which read game_results. validate-result.ts was never actually
-- the boundary it claims to be for this table; only `streaks` was protected
-- (select-only).
--
-- Every app path only READS this table (archive-queries, profile-queries,
-- admin-queries, email dispatch); the sole writers are the two security-definer
-- RPCs above, which bypass RLS. So dropping client writes costs nothing.
drop policy if exists "results: own" on public.game_results;

create policy "results: own read" on public.game_results
  for select using (auth.uid() = user_id);
