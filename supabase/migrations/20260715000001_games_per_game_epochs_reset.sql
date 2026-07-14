-- supabase/migrations/20260715000001_games_per_game_epochs_reset.sql
--
-- Games were renumbered: each game now counts puzzles from ITS OWN launch day
-- instead of a shared 2025-01-01 platform epoch.
--
--   Alfazy       puzzle #0 = 2026-05-01 IST   (was global #485)
--   Integra      puzzle #0 = 2026-06-01 IST   (was global #516)
--   Hit and Blow puzzle #0 = 2026-07-01 IST   (was global #546)
--
-- The answer lists were also re-scrambled (new shuffle seeds in alfazy.ts,
-- integra.ts and hit-and-blow.ts), so a given puzzle number resolves to a
-- different word / equation / code than it did before.
--
-- ============================ DESTRUCTIVE — NO UNDO ============================
-- Every stored puzzle_number was written under the OLD global numbering, and its
-- answer under the OLD list ordering. Nothing below is meaningful any more:
--
--   game_results    Every play, streak, leaderboard entry and archive "solved"
--                   mark, for every player. All of it goes.
--
--   alfazy_puzzles  Pre-seeded words for puzzles 0..(today+60) under the OLD
--                   numbering (see scripts/seed-alfazy-puzzles.ts). These MUST be
--                   cleared: wordForPuzzle() prefers a DB row over the code
--                   formula, so leaving them in place would override the
--                   re-scramble for ~600 days and keep serving the old words on
--                   the new puzzle numbers. Clearing them lets the code formula
--                   drive; the admin can schedule fresh overrides from /admin.
--
--   integra_puzzles Admin equation overrides keyed to old puzzle numbers.
--
-- Run this ONLY when you intend to reset all game history to zero.
-- ==============================================================================

-- delete rather than truncate: plain DML, so it respects any FK wiring and stays
-- inside the migration's transaction.
delete from public.game_results;
delete from public.alfazy_puzzles;
delete from public.integra_puzzles;
