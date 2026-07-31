-- Game Challenges: member-authored custom puzzles, shared by link, server-scored.
-- Manual-SQL workflow: run this whole file in the Supabase SQL editor. Not auto-applied.
--
-- Secret stays server-only: rows are selectable but the `secret` column is NOT
-- granted to anon/authenticated (column-level grant below). It is read only by
-- the service role inside server actions.

-- ---------- tables ----------
create table if not exists public.game_challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game game_key not null,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  secret text not null,
  title text,
  is_public boolean not null default false,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  play_count int not null default 0,
  crack_count int not null default 0
);
create index if not exists game_challenges_browse_idx
  on public.game_challenges (game, created_at desc)
  where is_public and status = 'open';
create index if not exists game_challenges_creator_idx
  on public.game_challenges (creator_user_id, created_at desc);

create table if not exists public.game_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.game_challenges(id) on delete cascade,
  player_user_id uuid references public.profiles(id) on delete cascade,
  guest_key text,
  guesses int not null default 0,
  guess_data jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress','won','lost')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_ms int
);
create unique index if not exists challenge_attempt_user_uniq
  on public.game_challenge_attempts (challenge_id, player_user_id)
  where player_user_id is not null;
create unique index if not exists challenge_attempt_guest_uniq
  on public.game_challenge_attempts (challenge_id, guest_key)
  where guest_key is not null;
create index if not exists challenge_attempt_board_idx
  on public.game_challenge_attempts (challenge_id, status);

-- ---------- RLS: reads via policy; writes only via service role (no write policy) ----------
alter table public.game_challenges enable row level security;
alter table public.game_challenge_attempts enable row level security;

create policy "challenges: public or own read" on public.game_challenges
  for select using (is_public or auth.uid() = creator_user_id);
create policy "challenge attempts: read" on public.game_challenge_attempts
  for select using (true);

-- Column-level grants keep `secret` server-only even though rows are selectable.
revoke all on public.game_challenges from anon, authenticated;
grant select (id, code, game, creator_user_id, title, is_public, status,
              created_at, expires_at, play_count, crack_count)
  on public.game_challenges to anon, authenticated;
grant select on public.game_challenge_attempts to anon, authenticated;

-- ---------- create ----------
-- Enforces 15-per-rolling-30-days, generates a short code, 30-day expiry.
-- Capability gating happens in the server action before this call.
create or replace function public.create_challenge(
  p_game game_key, p_secret text, p_title text, p_is_public boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_recent int;
  v_code text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select count(*) into v_recent from public.game_challenges
    where creator_user_id = v_user and created_at > now() - interval '30 days';
  if v_recent >= 15 then raise exception 'challenge limit reached'; end if;
  loop
    v_code := substr(replace(gen_random_uuid()::text,'-',''), 1, 8);
    exit when not exists (select 1 from public.game_challenges where code = v_code);
  end loop;
  insert into public.game_challenges (code, game, creator_user_id, secret, title, is_public, expires_at)
    values (v_code, p_game, v_user, p_secret, nullif(p_title,''), coalesce(p_is_public,false), now() + interval '30 days');
  return v_code;
end $$;

-- ---------- counters (called by service-role server actions) ----------
create or replace function public.increment_play_count(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.game_challenges set play_count = play_count + 1 where id = p_id;
$$;
create or replace function public.increment_crack_count(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.game_challenges set crack_count = crack_count + 1 where id = p_id;
$$;

-- ---------- creator management ----------
create or replace function public.close_challenge(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.game_challenges set status = 'closed'
  where code = p_code and creator_user_id = auth.uid();
$$;
create or replace function public.delete_challenge(p_code text)
returns void language sql security definer set search_path = public as $$
  delete from public.game_challenges
  where code = p_code and creator_user_id = auth.uid();
$$;

-- ---------- guest -> member attach on sign-in ----------
-- Move a browser's guest attempts to the user, skipping challenges where the
-- user already has an attempt (the unique index would otherwise reject).
create or replace function public.attach_guest_attempts(p_guest_key text, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.game_challenge_attempts a
    set player_user_id = p_user, guest_key = null
  where a.guest_key = p_guest_key
    and not exists (
      select 1 from public.game_challenge_attempts b
      where b.challenge_id = a.challenge_id and b.player_user_id = p_user
    );
end $$;

-- ---------- reads ----------
create or replace function public.browse_challenges(p_game game_key, p_limit int, p_offset int)
returns table(code text, title text, crack_count int, play_count int, created_at timestamptz)
language sql security definer set search_path = public as $$
  select code, title, crack_count, play_count, created_at
  from public.game_challenges
  where game = p_game and is_public and status = 'open' and expires_at > now()
  order by created_at desc
  limit greatest(1, least(p_limit, 50)) offset greatest(0, p_offset);
$$;

-- One challenge's ranked, finished attempts. profiles has no display_name — username only.
create or replace function public.challenge_leaderboard(p_code text)
returns table(username text, status text, guesses int, time_ms int)
language sql security definer set search_path = public as $$
  select p.username, a.status, a.guesses, a.time_ms
  from public.game_challenge_attempts a
  join public.game_challenges c on c.id = a.challenge_id
  left join public.profiles p on p.id = a.player_user_id
  where c.code = p_code and a.status <> 'in_progress'
  order by (a.status = 'won') desc, a.guesses asc,
           coalesce(a.time_ms, 2147483647) asc, a.finished_at asc;
$$;

create or replace function public.my_challenges(p_game game_key)
returns table(code text, title text, is_public boolean, status text,
              crack_count int, play_count int, created_at timestamptz, expires_at timestamptz)
language sql security definer set search_path = public as $$
  select code, title, is_public, status, crack_count, play_count, created_at, expires_at
  from public.game_challenges
  where game = p_game and creator_user_id = auth.uid()
  order by created_at desc;
$$;

-- ---------- grants ----------
grant execute on function public.create_challenge(game_key, text, text, boolean) to authenticated;
grant execute on function public.close_challenge(text)  to authenticated;
grant execute on function public.delete_challenge(text) to authenticated;
grant execute on function public.browse_challenges(game_key, int, int) to anon, authenticated;
grant execute on function public.challenge_leaderboard(text) to anon, authenticated;
grant execute on function public.my_challenges(game_key) to authenticated;
-- Counter + attach RPCs are only ever called with the service role, which bypasses
-- grants; do NOT grant them to anon/authenticated.
