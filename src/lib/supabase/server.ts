import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES row-level security.
 * SERVER ONLY: used in API route handlers to insert pending supports and
 * to mark them paid/failed from the Zoho webhook.
 *
 * The `server-only` import makes the build fail if this module is ever
 * pulled into client code, so the service-role key can never ship to the
 * browser. Never add `NEXT_PUBLIC_` to the service-role key.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createServerSupabase() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
