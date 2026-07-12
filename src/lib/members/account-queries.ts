import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** The current user's optional profile fields, read via the owner-scoped RPC. */
export type MyAccount = {
  full_name: string | null;
  date_of_birth: string | null;
  location: string | null;
  whatsapp: string | null;
};

const EMPTY: MyAccount = { full_name: null, date_of_birth: null, location: null, whatsapp: null };

/** PII columns aren't directly selectable; `get_my_account` (security definer) returns the caller's own. */
export async function getMyAccount(): Promise<MyAccount> {
  const sb = await supabaseAuthServer();
  const { data } = await sb.rpc("get_my_account").maybeSingle();
  return (data as MyAccount | null) ?? EMPTY;
}
