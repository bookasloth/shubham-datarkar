-- =====================================================================
-- Build-in-public spine: opt-in thread + version tags on notes.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- thread groups notes into one feature arc; version tags a release.
-- Both nullable + opt-in (written from a PR body `Thread:` / `Version:` line).
-- =====================================================================

alter table public.community_posts add column if not exists thread  text;
alter table public.community_posts add column if not exists version text;

-- Partial indexes: only tagged rows, ordered for the story/release pages.
create index if not exists community_posts_thread_idx
  on public.community_posts (thread, created_at) where thread is not null;
create index if not exists community_posts_version_idx
  on public.community_posts (version, created_at) where version is not null;
