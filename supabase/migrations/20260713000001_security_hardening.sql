-- =====================================================================
-- Security hardening — RLS, column privileges, and a crawler-job lock.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). NOT the BAS project.
-- Apply MANUALLY via the SQL editor. Idempotent — safe to re-run.
--
-- Fixes (audit 2026-07-11):
--   1. contacts: any logged-in user could read every lead's PII. Gate to admin,
--      matching the subscribers/supports read policies.
--   2. profiles: the self-update policy scoped the row but not the columns, so a
--      user could self-set is_founder (fake gold badge) or banned=false (evade a
--      moderator ban). Restrict UPDATE to identity columns only.
--   3. profiles: the public self-read exposed the moderation columns (banned,
--      banned_reason) to the anon key. Hide them; keep identity columns public.
--   4. kalamai_analyses: add a claim column so /step can't be fanned out into
--      duplicate paid LLM calls (paired with the runStep single-flight claim).
-- =====================================================================

-- 1. contacts — reads are admin-only.
drop policy if exists "contacts_authenticated_read" on public.contacts;
drop policy if exists "contacts_admin_read" on public.contacts;
create policy "contacts_admin_read"
  on public.contacts
  for select
  to authenticated
  using (public.is_admin());

-- 2. profiles — authenticated may edit ONLY their own identity fields. The
--    badge/moderation columns (is_founder, banned, banned_reason) are written by
--    admin-only definer RPCs, never by the user.
--    NOTE: a column-level REVOKE alone is not enough — a table-level UPDATE grant
--    covers every column regardless. So drop the table grant, then re-grant only
--    the safe columns. (Row inserts happen via the handle_new_user definer
--    trigger, so authenticated/anon need no INSERT.)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, bio) on public.profiles to authenticated;

-- 3. profiles — hide moderation columns from the public anon key; keep the
--    public identity columns readable (usernames, badges).
revoke select on public.profiles from anon;
grant select (id, username, display_name, bio, is_founder, created_at)
  on public.profiles to anon;

-- 4. kalamai_analyses — single-flight claim column for the step state machine.
alter table public.kalamai_analyses add column if not exists locked_at timestamptz;
