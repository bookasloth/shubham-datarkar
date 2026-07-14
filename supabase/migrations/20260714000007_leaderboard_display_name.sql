-- Leaderboard RPCs return display_name alongside username so the UI can show a
-- real name column and reserve @username for the handle. Signature change =
-- must drop+recreate (create or replace won't alter return type).

drop function if exists public.get_daily_board(game_key, int);
drop function if exists public.get_period_board(game_key, date, date);
drop function if exists public.get_streak_board(game_key);

create or replace function public.get_daily_board(p_game game_key, p_puzzle int)
returns table (username text, display_name text, guesses int, time_ms int, status result_status)
language sql security definer set search_path = public as $$
  select p.username, p.display_name, r.guesses, r.time_ms, r.status
  from public.game_results r join public.profiles p on p.id = r.user_id
  where r.game = p_game and r.puzzle_number = p_puzzle and r.status = 'won'
  order by r.guesses asc, r.time_ms asc nulls last
  limit 100;
$$;

create or replace function public.get_period_board(p_game game_key, p_start date, p_end date)
returns table (username text, display_name text, solved int, total_guesses int)
language sql security definer set search_path = public as $$
  select p.username, p.display_name,
         count(*) filter (where r.status = 'won')::int as solved,
         coalesce(sum(r.guesses) filter (where r.status = 'won'), 0)::int as total_guesses
  from public.game_results r join public.profiles p on p.id = r.user_id
  where r.game = p_game and r.puzzle_date between p_start and p_end
  group by p.username, p.display_name
  having count(*) filter (where r.status = 'won') > 0
  order by solved desc, total_guesses asc
  limit 100;
$$;

create or replace function public.get_streak_board(p_game game_key)
returns table (username text, display_name text, current_streak int, max_streak int)
language sql security definer set search_path = public as $$
  select p.username, p.display_name, s.current_streak, s.max_streak
  from public.streaks s join public.profiles p on p.id = s.user_id
  where s.game = p_game
  order by s.current_streak desc, s.max_streak desc
  limit 100;
$$;

grant execute on function public.get_daily_board  to authenticated, anon;
grant execute on function public.get_period_board to authenticated, anon;
grant execute on function public.get_streak_board to authenticated, anon;
