-- supabase/migrations/20260710000001_nerdle.sql
-- Adds the Nerdle-style daily math game to the games platform.
--   1. New game_key enum value.
--   2. nerdle_puzzles override table (mirrors alfazy_puzzles) — admin can override
--      any FUTURE day's equation; the app falls back to the frozen code list
--      (EQUATION_LIST) for any puzzle_number with no row.
-- game_results / streaks / submit_result / leaderboard RPCs are already
-- game_key-parameterized and need no change beyond the enum value.
--
-- Note: nothing in this file uses 'nerdle'::game_key as a literal, so adding the
-- enum value in the same migration is safe (the new value is only referenced at
-- runtime, after commit, when the client passes p_game => 'nerdle').

alter type public.game_key add value if not exists 'nerdle';

create table public.nerdle_puzzles (
  puzzle_number int primary key,
  equation      text not null check (
    char_length(equation) = 7
    and equation ~ '^[0-9+*/=-]+$'
    and char_length(equation) - char_length(replace(equation, '=', '')) = 1
  ),
  updated_at    timestamptz default now()
);

alter table public.nerdle_puzzles enable row level security;
-- Public read: the answer is already client-visible in today's build; parity.
create policy "nerdle_puzzles: public read" on public.nerdle_puzzles
  for select using (true);

create or replace function public.admin_list_nerdle_puzzles(p_from int)
returns table (puzzle_number int, equation text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select puzzle_number, equation, updated_at
  from public.nerdle_puzzles
  where public.is_games_admin() and puzzle_number >= p_from
  order by puzzle_number
  limit 200;
$$;

create or replace function public.admin_upsert_nerdle_puzzle(p_puzzle int, p_equation text, p_today int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  -- Freeze the past + today at the DB boundary (not only in the app action):
  -- rewriting a played answer would corrupt stored game_results + share grids.
  -- The app passes its own puzzleNumberFor() as p_today.
  if p_puzzle <= p_today then raise exception 'cannot edit a past or current puzzle'; end if;
  -- Structural sanity only; full equation validity (order of ops, exact division)
  -- is enforced app-side by isValidGuess before this is called.
  if char_length(p_equation) <> 7
     or p_equation !~ '^[0-9+*/=-]+$'
     or char_length(p_equation) - char_length(replace(p_equation, '=', '')) <> 1 then
    raise exception 'equation must be 7 chars, allowed symbols only, exactly one =';
  end if;
  insert into public.nerdle_puzzles (puzzle_number, equation, updated_at)
  values (p_puzzle, p_equation, now())
  on conflict (puzzle_number) do update set equation = excluded.equation, updated_at = now();
end; $$;

-- Deleting a row is safe for ANY puzzle only because equationForPuzzle falls back
-- to answerFor(n): deleting a past override restores the frozen list answer.
create or replace function public.admin_delete_nerdle_puzzle(p_puzzle int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  delete from public.nerdle_puzzles where puzzle_number = p_puzzle;
end; $$;

grant execute on function public.admin_list_nerdle_puzzles  to authenticated;
grant execute on function public.admin_upsert_nerdle_puzzle to authenticated;
grant execute on function public.admin_delete_nerdle_puzzle to authenticated;
