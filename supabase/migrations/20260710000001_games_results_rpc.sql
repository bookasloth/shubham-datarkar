-- =============================================================
--  get_results_page — all-players results feed for one game.
--  Past puzzles only (p_before = today's puzzle number; strictly <).
--  Finished games only. Security definer: game_results RLS is
--  own-rows-only, so cross-user reads must go through a definer fn,
--  same pattern as get_daily_board / get_period_board / get_streak_board.
-- =============================================================
create or replace function public.get_results_page(
  p_game    game_key,
  p_before  int,
  p_outcome text default 'all',   -- 'all' | 'won' | 'lost'
  p_player  text default null,    -- ILIKE substring on username; null = no filter
  p_limit   int  default 50,
  p_offset  int  default 0
) returns table (
  username      text,
  puzzle_number int,
  puzzle_date   date,
  guesses       int,
  time_ms       int,
  status        result_status
)
language sql security definer set search_path = public as $$
  select p.username, r.puzzle_number, r.puzzle_date, r.guesses, r.time_ms, r.status
  from public.game_results r
  join public.profiles p on p.id = r.user_id
  where r.game = p_game
    and r.puzzle_number < p_before
    and r.status in ('won', 'lost')
    and (p_outcome = 'all' or r.status::text = p_outcome)
    and (p_player is null or p.username ilike '%' || p_player || '%')
  order by r.puzzle_number desc, r.guesses asc, r.time_ms asc nulls last
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.get_results_page to authenticated, anon;
