-- =============================================================
--  Latent grant fragility: two "admin only" tables have a read policy that
--  checks NOTHING.
--
--  email_integration and affiliate_domains both carry
--    for select to authenticated using (true)
--  and are safe today only because neither table has a `grant select` to
--  authenticated, so PostgREST denies the read. The policy itself is wide open —
--  a future broad grant (or a `grant on all tables`) would instantly expose SMTP
--  test metadata and the affiliate allowlist to every logged-in user.
--
--  Move the guard into the policy where it belongs: gate on is_admin(). This only
--  tightens (fewer rows visible), so it can't break anything — admin reads that
--  need these rows already go through the service-role client (RLS bypass).
-- =============================================================

drop policy if exists "email_integration_authenticated_read" on public.email_integration;
create policy "email_integration_authenticated_read"
  on public.email_integration
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists affiliate_domains_authenticated_read on public.affiliate_domains;
create policy affiliate_domains_authenticated_read
  on public.affiliate_domains
  for select
  to authenticated
  using (public.is_admin());
