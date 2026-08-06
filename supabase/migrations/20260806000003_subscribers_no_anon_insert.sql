-- =============================================================
--  Unbounded anonymous newsletter signup.
--
--  subscribers has `subscribers_public_insert` (for insert to anon with check
--  (true)) plus `grant insert to anon`. The subscribe() server action rate-limits
--  and validates the email — but that guard is toothless, because anon can skip
--  the action entirely and POST /rest/v1/subscribers directly with the public
--  anon key: unlimited arbitrary rows (other people's emails, spam, table bloat).
--
--  Close the direct write path. subscribe() now inserts via supabaseAdmin()
--  (service_role, bypasses RLS), so the ONLY way to add a subscriber is through
--  the rate-limited, email-validated action. Drop the anon insert policy and
--  revoke the grant. Admin read/write policies are untouched.
--
--  Deploy app-first for zero gap: the new action uses service_role and works
--  whether or not this migration has run; running the migration then removes the
--  direct hole. (Migration-first briefly fails signups — the old anon insert is
--  denied — until the redeploy.)
-- =============================================================

drop policy if exists subscribers_public_insert on public.subscribers;
revoke insert on public.subscribers from anon;
-- authenticated keeps table access via the admin policies (is_admin()); its
-- insert is still gated by those, not by an open with-check.
