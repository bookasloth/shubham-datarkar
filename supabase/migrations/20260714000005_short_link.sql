-- =====================================================================
-- Link shortener for /community — shubhamdatarkar.com/s/{7-char}.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
--
-- Any http(s) URL in a post body renders as shubhamdatarkar.com/s/{slug} and
-- /s/{slug} 307s to the original. Codes are minted on READ (feed render), so
-- old seed + auto-posted links get shortened with no backfill and without
-- touching the 5+ insert paths.
--
-- Table is fully locked (RLS on, no policies): every access goes through the
-- two SECURITY DEFINER RPCs below, so anon never touches rows directly.
-- =====================================================================

create table if not exists public.short_link (
  slug        text primary key,
  target_url  text not null unique,
  clicks      integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.short_link enable row level security;
-- No policies on purpose — reads/writes only via the definer RPCs.

-- ---------- 7-char base62 slug generator ----------
create or replace function public.gen_short_slug()
returns text language plpgsql volatile as $$
declare
  alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  s text := '';
  i int;
begin
  for i in 1..7 loop
    -- random() is [0,1) -> floor(random()*62) is 0..61 -> substr is 1-indexed
    s := s || substr(alphabet, 1 + floor(random() * 62)::int, 1);
  end loop;
  return s;
end $$;

-- ---------- mint-or-lookup a code per URL (render path) ----------
-- Returns one (url, slug) row per distinct http(s) URL. Non-http inputs are
-- skipped (never shortened). Same URL always maps to the same slug.
create or replace function public.ensure_short_links(p_urls text[])
returns table(url text, slug text)
language plpgsql security definer set search_path = public as $$
declare
  u text;
  new_slug text;
begin
  foreach u in array coalesce(p_urls, '{}') loop
    continue when u !~* '^https?://';

    -- fast path: already mapped
    if exists (select 1 from short_link sl where sl.target_url = u) then
      return query select u, sl.slug from short_link sl where sl.target_url = u;
      continue;
    end if;

    -- mint, retrying on a slug (PK) collision; a concurrent insert of the SAME
    -- url surfaces as unique_violation on target_url -> use the winner's row.
    loop
      new_slug := gen_short_slug();
      begin
        insert into short_link (slug, target_url) values (new_slug, u);
        exit;
      exception when unique_violation then
        exit when exists (select 1 from short_link sl where sl.target_url = u);
        -- else the slug collided: loop and regenerate
      end;
    end loop;

    return query select u, sl.slug from short_link sl where sl.target_url = u;
  end loop;
end $$;

grant execute on function public.ensure_short_links(text[]) to anon, authenticated;

-- ---------- resolve a code -> target, bumping the click counter ----------
create or replace function public.resolve_short_link(p_slug text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_url text;
begin
  update short_link set clicks = clicks + 1
   where slug = p_slug
   returning target_url into v_url;
  return v_url;  -- null when the slug is unknown
end $$;

grant execute on function public.resolve_short_link(text) to anon, authenticated;
