-- supabase/migrations/20260705000002_games_admin.sql
-- =============================================================
--  /admin/games — admin-only moderation RPCs.
--  security definer + explicit admin guard (email from JWT).
--  Set the admin email once:  select set_config('app.admin_email', '<email>', false);
--  is NOT persistent — instead we hardcode via a helper that reads the same
--  ADMIN_EMAIL the app uses. Simplest portable check: compare to a fixed value.
-- =============================================================

-- Helper: is the caller the site admin?
-- Replace the literal below with the site's admin email (matches ADMIN_EMAIL env).
create or replace function public.is_games_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'REPLACE_WITH_ADMIN_EMAIL';
$$;

create or replace function public.admin_list_players()
returns table (id uuid, username text, created_at timestamptz, total_played int, total_won int)
language sql security definer set search_path = public as $$
  select p.id, p.username, p.created_at,
         coalesce(sum(s.total_played), 0)::int,
         coalesce(sum(s.total_won), 0)::int
  from public.profiles p
  left join public.streaks s on s.user_id = p.id
  where public.is_games_admin()
  group by p.id, p.username, p.created_at
  order by p.created_at desc
  limit 500;
$$;

create or replace function public.admin_player_results(p_user uuid)
returns table (id uuid, game game_key, puzzle_number int, puzzle_date date, status result_status, guesses int)
language sql security definer set search_path = public as $$
  select r.id, r.game, r.puzzle_number, r.puzzle_date, r.status, r.guesses
  from public.game_results r
  where public.is_games_admin() and r.user_id = p_user
  order by r.puzzle_date desc, r.game
  limit 500;
$$;

create or replace function public.admin_player_streaks(p_user uuid)
returns table (game game_key, current_streak int, max_streak int, total_played int, total_won int)
language sql security definer set search_path = public as $$
  select s.game, s.current_streak, s.max_streak, s.total_played, s.total_won
  from public.streaks s
  where public.is_games_admin() and s.user_id = p_user
  order by s.game;
$$;

create or replace function public.admin_delete_result(p_result uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  delete from public.game_results where id = p_result;
end; $$;

create or replace function public.admin_reset_streak(p_user uuid, p_game game_key)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  update public.streaks
    set current_streak = 0, max_streak = 0, last_solved_puzzle = null,
        total_played = 0, total_won = 0
    where user_id = p_user and game = p_game;
end; $$;

create or replace function public.admin_rename_user(p_user uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'username too short';
  end if;
  update public.profiles set username = trim(p_username) where id = p_user;
end; $$;

grant execute on function public.admin_list_players    to authenticated;
grant execute on function public.admin_player_results  to authenticated;
grant execute on function public.admin_player_streaks  to authenticated;
grant execute on function public.admin_delete_result   to authenticated;
grant execute on function public.admin_reset_streak    to authenticated;
grant execute on function public.admin_rename_user     to authenticated;
