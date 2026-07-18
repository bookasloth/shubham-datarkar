-- Onboarding state + self-serve username.
alter table public.profiles add column if not exists onboarded_at   timestamptz;
alter table public.profiles add column if not exists referral_source text;

-- member_account_fields.sql re-scoped authenticated SELECT to an explicit column
-- list (withholding PII). onboarded_at is not sensitive and the /welcome page
-- reads it via the session client to gate re-onboarding, so grant it. Column
-- grants are additive. referral_source stays withheld — it is only ever written.
grant select (onboarded_at) on public.profiles to authenticated;

-- security_hardening.sql revoked base UPDATE on profiles and allowlisted only
-- (username, display_name, bio). The onboarding flow writes these two columns
-- from the user's own session, so add them to the UPDATE allowlist. RLS
-- ("profiles: self write", auth.uid() = id) still restricts writes to the
-- caller's own row. Column grants are additive.
grant update (onboarded_at, referral_source) on public.profiles to authenticated;

-- Let a signed-in user set their own username, with uniqueness + format rules.
-- security definer so the unique-violation is caught server-side and surfaced
-- as a friendly error. Callable by the authenticated user for their own row only
-- (uses auth.uid()).
create or replace function public.set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := trim(p_username);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- v is null when p_username is null; guard explicitly so a null doesn't skip
  -- the regex (NULL !~ pattern is NULL, which PL/pgSQL's IF treats as false).
  if v is null or v !~ '^[a-zA-Z0-9_.]{3,30}$' then
    raise exception 'username must be 3-30 chars: letters, numbers, dot, underscore';
  end if;
  update public.profiles set username = v where id = auth.uid();
exception
  when unique_violation then raise exception 'username already taken';
end;
$$;

revoke all on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;
