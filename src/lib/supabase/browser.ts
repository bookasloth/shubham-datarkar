import { createClient } from "@supabase/supabase-js";

/**
 * Public Supabase client (anon key). Safe to use in client components.
 * RLS limits this to reading paid, anonymized supporter rows only — it
 * can never see emails or write data. No auth/session is used by the
 * support module, so session persistence is disabled.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
