-- Admin read access to the supports base table (for the payments dashboard).
-- Public still reads only the email-free views; this grants the authenticated
-- admin full row access (incl. email + pending/failed) via is_admin().
-- Target: your OWN Supabase project. Run manually.

grant select on public.supports to authenticated;

drop policy if exists supports_admin_read on public.supports;
create policy supports_admin_read on public.supports
  for select
  to authenticated
  using (public.is_admin());
