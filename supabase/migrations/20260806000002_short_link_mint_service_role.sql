-- =============================================================
--  Anonymous short-link minting: brand-abuse / open-redirect vector.
--
--  ensure_short_links(text[]) is security-definer and was granted to anon: any
--  unauthenticated caller could mint shubhamdatarkar.com/s/{slug} pointing at an
--  ARBITRARY http(s) URL (no auth, allowlist, or rate limit), and
--  resolve_short_link 307-redirects to it. That launders phishing/malware links
--  under the trusted domain and burns its reputation with spam filters.
--
--  Minting is only ever needed on the server render path (ensureShortLinks in
--  src/lib/community/short-link.ts), so make it trusted-server-only: revoke from
--  anon/authenticated AND from PUBLIC (functions get EXECUTE to PUBLIC by default,
--  so revoking only the two roles would leave the inherited PUBLIC grant intact),
--  and grant service_role. The render path now calls it via supabaseAdmin().
--
--  resolve_short_link stays anon: it's a read-only redirect of rows that were
--  already vetted at mint time, and /s/{slug} must work for logged-out visitors.
--
--  Graceful either deploy order: if this runs before the app redeploys, the old
--  anon render call is denied and ensureShortLinks falls back to the raw href
--  (best-effort catch) — links just render unshortened, nothing breaks.
-- =============================================================

revoke execute on function public.ensure_short_links(text[]) from public, anon, authenticated;
grant execute on function public.ensure_short_links(text[]) to service_role;
