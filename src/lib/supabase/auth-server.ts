import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-aware Supabase client for auth (login session).
 * Reads/writes the session cookie via Next's async cookies() store.
 * Distinct from src/lib/supabase/server.ts, which is service-role/anon
 * read/write with no session.
 */
export async function supabaseAuthServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render where cookies are
            // read-only. Safe to ignore: proxy.ts refreshes the cookie.
          }
        },
      },
    },
  );
}
