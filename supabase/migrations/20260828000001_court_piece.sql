-- Court Piece — server-authoritative multiplayer (P1).
-- Run this whole file in the Supabase SQL editor.
--
-- One row per room. The ENTIRE authoritative game (players, hands, deck, shuffle
-- seed, current trick, move log) lives in `state` (jsonb). That is why NO client
-- role may read this table: a row read would leak every hand and the deck. All
-- access goes through Next.js server actions using the service role, which return
-- only a per-seat sanitized view. `version` powers optimistic concurrency: a write
-- is guarded on the version it read, so two simultaneous moves serialize.

create table if not exists public.cp_games (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  status     text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  state      jsonb not null,
  version    integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cp_games_code_idx on public.cp_games (code);
create index if not exists cp_games_status_idx on public.cp_games (status);

alter table public.cp_games enable row level security;

-- No policies for anon/authenticated => RLS denies every row to them. The service
-- role bypasses RLS. Revoke table grants too, so the state is unreachable even if a
-- policy is ever added by mistake.
revoke all on public.cp_games from anon, authenticated;
