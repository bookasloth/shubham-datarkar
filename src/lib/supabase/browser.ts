import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (anon key).
 *
 * Safe to use in client components. The anon key only reaches the public,
 * email-free views (`public_supporters`, `support_lifetime`, `support_stats`)
 * — the `supports` base table is locked by RLS with no anon policy, so raw
 * rows (incl. email) are never readable from the browser.
 *
 * Singleton: one client per tab.
 */
let client: SupabaseClient | undefined;

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.",
    );
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false }, // no visitor auth in v1
  });
  return client;
}
