import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase clients. `server-only` guarantees this module can never
 * be bundled into client code — protecting the service-role key.
 *
 * Two clients, two privilege levels:
 *  - `supabaseAnon()`  — anon key, for reading the public views in Server
 *    Components / route handlers. Subject to RLS (sees only the views).
 *  - `supabaseAdmin()` — service-role key, BYPASSES RLS. Use ONLY in API
 *    routes to insert/update `supports` rows (session create, webhook).
 *    Never return raw rows from this client to the client side.
 */

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const baseOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

let anonClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

/** Anon server client — public-view reads only. */
export function supabaseAnon(): SupabaseClient {
  if (anonClient) return anonClient;
  anonClient = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    baseOptions,
  );
  return anonClient;
}

/** Service-role server client — RLS bypass. Server-only, writes only. */
export function supabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  adminClient = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    baseOptions,
  );
  return adminClient;
}
