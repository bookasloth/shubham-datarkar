-- =============================================================
--  /games  —  Alfazy + Hit and Blow  —  initial schema
--  Auth: email + password (Supabase Auth). Reset TZ: IST.
-- =============================================================

-- ---------- enums ----------
create type game_key      as enum ('alfazy', 'hit_and_blow');
create type result_status as enum ('in_progress', 'won', 'lost');

-- ---------- profiles ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  created_at timestamptz default now()
);

-- ---------- results: one row per (user, game, puzzle) ----------
create table public.game_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  game          game_key not null,
  puzzle_number int not null,
  puzzle_date   date not null,
  status        result_status not null default 'in_progress',
  guesses       int not null default 0,
  guess_data    jsonb,                 -- array of guesses (replay + share render)
  time_ms       int,                   -- solve time, leaderboard tiebreak
  completed_at  timestamptz,
  updated_at    timestamptz default now(),
  unique (user_id, game, puzzle_number) -- cannot replay a puzzle
);
create index game_results_board_idx on public.game_results (game, puzzle_number, status);
create index game_results_period_idx on public.game_results (game, puzzle_date, status);

-- ---------- denormalized streaks (cheap reads) ----------
create table public.streaks (
  user_id            uuid not null references public.profiles(id) on delete cascade,
  game               game_key not null,
  current_streak     int not null default 0,
  max_streak         int not null default 0,
  last_solved_puzzle int,
  total_played       int not null default 0,
  total_won          int not null default 0,
  primary key (user_id, game)
);

-- ---------- auto-create a profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    -- provisional unique handle; user can rename in /games/profile
    lower(split_part(new.email, '@', 1)) || '_' || substr(md5(new.id::text), 1, 4)
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
--  Row Level Security — users touch only their own rows.
--  Leaderboards are read ONLY through the security-definer RPCs below.
-- =============================================================
alter table public.profiles     enable row level security;
alter table public.game_results enable row level security;
alter table public.streaks      enable row level security;

create policy "profiles: self read"  on public.profiles for select using (true); -- usernames are public
create policy "profiles: self write" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "results: own"  on public.game_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "streaks: own read" on public.streaks
  for select using (auth.uid() = user_id);

-- =============================================================
--  submit_result — the trusted write path.
--  Call this from a Next.js SERVER ACTION *after* the server has
--  re-derived the answer and validated guess_data (v2 hardening).
--  It upserts the result and updates the streak atomically.
-- =============================================================
create or replace function public.submit_result(
  p_game    game_key,
  p_puzzle  int,
  p_date    date,
  p_status  result_status,
  p_guesses int,
  p_guess_data jsonb,
  p_time_ms int
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_last int;
  v_cur  int;
  v_max  int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  insert into public.game_results
    (user_id, game, puzzle_number, puzzle_date, status, guesses, guess_data, time_ms, completed_at, updated_at)
  values
    (v_user, p_game, p_puzzle, p_date, p_status, p_guesses, p_guess_data, p_time_ms,
     case when p_status <> 'in_progress' then now() end, now())
  on conflict (user_id, game, puzzle_number) do update
    set status = excluded.status,
        guesses = excluded.guesses,
        guess_data = excluded.guess_data,
        time_ms = excluded.time_ms,
        completed_at = excluded.completed_at,
        updated_at = now();

  if p_status = 'in_progress' then return; end if;

  -- ensure a streak row exists
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
--  Leaderboards (security definer — expose only safe columns).
-- =============================================================

-- Daily board: performance on ONE puzzle. No guess_data (would leak the answer).
create or replace function public.get_daily_board(p_game game_key, p_puzzle int)
returns table (username text, guesses int, time_ms int, status result_status)
language sql security definer set search_path = public as $$
  select p.username, r.guesses, r.time_ms, r.status
  from public.game_results r join public.profiles p on p.id = r.user_id
  where r.game = p_game and r.puzzle_number = p_puzzle and r.status = 'won'
  order by r.guesses asc, r.time_ms asc nulls last
  limit 100;
$$;

-- Period board: aggregate over a date range (pass week or month bounds from the app).
create or replace function public.get_period_board(p_game game_key, p_start date, p_end date)
returns table (username text, solved int, total_guesses int)
language sql security definer set search_path = public as $$
  select p.username,
         count(*) filter (where r.status = 'won')::int as solved,
         coalesce(sum(r.guesses) filter (where r.status = 'won'), 0)::int as total_guesses
  from public.game_results r join public.profiles p on p.id = r.user_id
  where r.game = p_game and r.puzzle_date between p_start and p_end
  group by p.username
  having count(*) filter (where r.status = 'won') > 0
  order by solved desc, total_guesses asc
  limit 100;
$$;

-- Streak board.
create or replace function public.get_streak_board(p_game game_key)
returns table (username text, current_streak int, max_streak int)
language sql security definer set search_path = public as $$
  select p.username, s.current_streak, s.max_streak
  from public.streaks s join public.profiles p on p.id = s.user_id
  where s.game = p_game
  order by s.current_streak desc, s.max_streak desc
  limit 100;
$$;

grant execute on function public.submit_result   to authenticated;
grant execute on function public.get_daily_board  to authenticated, anon;
grant execute on function public.get_period_board to authenticated, anon;
grant execute on function public.get_streak_board to authenticated, anon;
