-- supabase/migrations/20260710000002_integra_rename.sql
-- Product rename: the math game "Nerdle" became "Integra". Renames the DB objects
-- created in 20260710000001 to match the renamed app code. Nothing was deployed;
-- run this after 20260710000001.
--
-- Note: renaming a table does NOT rewrite function bodies that reference it, so the
-- three admin functions are dropped and recreated against integra_puzzles rather
-- than renamed.

-- 1. Enum value (PG10+ supports RENAME VALUE). Existing game_results/streaks rows
--    carrying 'nerdle' are updated in place by the rename — no data migration needed.
alter type public.game_key rename value 'nerdle' to 'integra';

-- 2. Override table + its RLS policy.
alter table public.nerdle_puzzles rename to integra_puzzles;
alter policy "nerdle_puzzles: public read" on public.integra_puzzles
  rename to "integra_puzzles: public read";

-- 3. Admin functions: drop the nerdle-named ones, recreate against integra_puzzles.
drop function if exists public.admin_list_nerdle_puzzles(int);
drop function if exists public.admin_upsert_nerdle_puzzle(int, text, int);
drop function if exists public.admin_delete_nerdle_puzzle(int);

create or replace function public.admin_list_integra_puzzles(p_from int)
returns table (puzzle_number int, equation text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select puzzle_number, equation, updated_at
  from public.integra_puzzles
  where public.is_games_admin() and puzzle_number >= p_from
  order by puzzle_number
  limit 200;
$$;

create or replace function public.admin_upsert_integra_puzzle(p_puzzle int, p_equation text, p_today int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  if p_puzzle <= p_today then raise exception 'cannot edit a past or current puzzle'; end if;
  if char_length(p_equation) <> 7
     or p_equation !~ '^[0-9+*/=-]+$'
     or char_length(p_equation) - char_length(replace(p_equation, '=', '')) <> 1 then
    raise exception 'equation must be 7 chars, allowed symbols only, exactly one =';
  end if;
  insert into public.integra_puzzles (puzzle_number, equation, updated_at)
  values (p_puzzle, p_equation, now())
  on conflict (puzzle_number) do update set equation = excluded.equation, updated_at = now();
end; $$;

create or replace function public.admin_delete_integra_puzzle(p_puzzle int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  delete from public.integra_puzzles where puzzle_number = p_puzzle;
end; $$;

grant execute on function public.admin_list_integra_puzzles  to authenticated;
grant execute on function public.admin_upsert_integra_puzzle to authenticated;
grant execute on function public.admin_delete_integra_puzzle to authenticated;
