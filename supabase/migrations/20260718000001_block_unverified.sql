-- Hard-block accounts that never verified their email within 48h. The app's
-- in-code gate (isUnverifiedPastGrace) already refuses their logins; this bans
-- dormant accounts so a stale session can't keep acting. Idempotent: skips rows
-- already banned into the future.
create or replace function public.block_unverified_accounts()
returns integer
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  n integer;
begin
  with blocked as (
    update auth.users
       set banned_until = now() + interval '100 years'
     where email_confirmed_at is null
       and created_at < now() - interval '48 hours'
       and (banned_until is null or banned_until < now())
    returning id
  )
  select count(*) into n from blocked;
  return n;
end;
$$;

revoke all on function public.block_unverified_accounts() from public, anon, authenticated;
