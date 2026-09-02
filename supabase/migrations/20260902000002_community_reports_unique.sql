-- =====================================================================
-- /community — one report per (post, reporter). Target: OWN Supabase. Apply
-- MANUALLY. Idempotent.
--
-- community_reports had no uniqueness, so one account could file unlimited
-- reports on one post and bury the moderation queue. reportPost() now treats a
-- 23505 on this index as success (idempotent "already reported"), and the
-- per-user report rate budget caps distinct-post spam.
--
-- Depends on 20260710000001 (community_reports).
-- =====================================================================

-- Drop pre-existing duplicates, keeping the earliest row per (post, reporter),
-- so the unique index can be created. No-op once already unique.
delete from public.community_reports a
using public.community_reports b
where a.ctid > b.ctid
  and a.post_id = b.post_id
  and a.reporter_id = b.reporter_id;

create unique index if not exists community_reports_once
  on public.community_reports (post_id, reporter_id);
