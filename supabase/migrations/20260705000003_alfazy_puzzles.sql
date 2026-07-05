-- supabase/migrations/20260705000003_alfazy_puzzles.sql
-- Alfazy words become DB-driven. Rows are pre-seeded (separate INSERT script)
-- so every already-played puzzle resolves to the exact same word; the app
-- falls back to the code formula for any puzzle_number with no row.
create table public.alfazy_puzzles (
  puzzle_number int primary key,
  word          text not null check (word ~ '^[a-z]{5}$'),
  updated_at    timestamptz default now()
);

alter table public.alfazy_puzzles enable row level security;
-- Public read: the answer is already client-visible in today's build; parity.
create policy "alfazy_puzzles: public read" on public.alfazy_puzzles
  for select using (true);

create or replace function public.admin_list_alfazy_puzzles(p_from int)
returns table (puzzle_number int, word text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select puzzle_number, word, updated_at
  from public.alfazy_puzzles
  where public.is_games_admin() and puzzle_number >= p_from
  order by puzzle_number
  limit 200;
$$;

create or replace function public.admin_upsert_alfazy_puzzle(p_puzzle int, p_word text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  if p_word !~ '^[a-z]{5}$' then raise exception 'word must be 5 lowercase letters'; end if;
  insert into public.alfazy_puzzles (puzzle_number, word, updated_at)
  values (p_puzzle, p_word, now())
  on conflict (puzzle_number) do update set word = excluded.word, updated_at = now();
end; $$;

create or replace function public.admin_delete_alfazy_puzzle(p_puzzle int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  delete from public.alfazy_puzzles where puzzle_number = p_puzzle;
end; $$;

grant execute on function public.admin_list_alfazy_puzzles  to authenticated;
grant execute on function public.admin_upsert_alfazy_puzzle to authenticated;
grant execute on function public.admin_delete_alfazy_puzzle to authenticated;
