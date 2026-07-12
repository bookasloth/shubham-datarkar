-- Member account: optional personal fields + birthday-greeting plumbing.
--
-- profiles has a permissive read policy ("profiles: self read" USING (true)) so
-- ANY authenticated user can read ANY row. New fields DOB / WhatsApp / location
-- are PII and must not ride that policy. So we:
--   1. add the columns (all nullable),
--   2. re-scope authenticated SELECT to only the pre-existing (non-PII) columns
--      — every column that existed before, so no existing query breaks,
--   3. expose owner read/write of the PII through security-definer RPCs that
--      check auth.uid(), and the birthday cron through service_role-only RPCs.

-- ---------- 1. columns ----------
alter table public.profiles add column if not exists full_name             text;
alter table public.profiles add column if not exists date_of_birth         date;
alter table public.profiles add column if not exists location              text;
alter table public.profiles add column if not exists whatsapp              text;
alter table public.profiles add column if not exists birthday_greeted_year smallint; -- last year we emailed them

-- ---------- 2. re-scope authenticated SELECT (withhold only the new PII) ----------
revoke select on public.profiles from authenticated;
grant  select (id, username, created_at, display_name, bio, is_founder, banned, banned_reason)
  on public.profiles to authenticated;

-- ---------- 3a. owner read of own PII ----------
create or replace function public.get_my_account()
returns table (full_name text, date_of_birth date, location text, whatsapp text)
language sql security definer set search_path = public stable as $$
  select full_name, date_of_birth, location, whatsapp
  from public.profiles
  where id = auth.uid();
$$;
revoke execute on function public.get_my_account() from anon;
grant  execute on function public.get_my_account() to authenticated;

-- ---------- 3b. owner write of own PII ----------
create or replace function public.update_my_account(
  p_full_name text,
  p_dob       date,
  p_location  text,
  p_whatsapp  text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    full_name     = nullif(btrim(p_full_name), ''),
    date_of_birth = p_dob,
    location      = nullif(btrim(p_location), ''),
    whatsapp      = nullif(btrim(p_whatsapp), '')
  where id = auth.uid();
end; $$;
revoke execute on function public.update_my_account(text, date, text, text) from anon;
grant  execute on function public.update_my_account(text, date, text, text) to authenticated;

-- ---------- 3c. birthday cron: whose birthday is today (IST), not yet greeted this year ----------
-- ponytail: Feb-29 births only fire in leap years (no fallback to Feb-28). Upgrade if it matters.
create or replace function public.birthdays_today()
returns table (id uuid, email text, full_name text)
language sql security definer set search_path = public stable as $$
  select p.id, u.email::text, p.full_name
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.date_of_birth is not null
    and u.email is not null
    and extract(month from p.date_of_birth) = extract(month from (now() at time zone 'Asia/Kolkata'))
    and extract(day   from p.date_of_birth) = extract(day   from (now() at time zone 'Asia/Kolkata'))
    and coalesce(p.birthday_greeted_year, 0)
        <> extract(year from (now() at time zone 'Asia/Kolkata'))::int;
$$;
revoke execute on function public.birthdays_today() from anon, authenticated;
grant  execute on function public.birthdays_today() to service_role;

-- ---------- 3d. birthday cron: mark greeted (idempotent within the year) ----------
create or replace function public.mark_birthday_greeted(p_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.profiles
    set birthday_greeted_year = extract(year from (now() at time zone 'Asia/Kolkata'))::int
    where id = p_id;
$$;
revoke execute on function public.mark_birthday_greeted(uuid) from anon, authenticated;
grant  execute on function public.mark_birthday_greeted(uuid) to service_role;
