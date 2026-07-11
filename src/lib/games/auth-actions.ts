"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

// Sign-in / sign-up moved to the consolidated /login (src/lib/auth/actions.ts).
// Only sign-out remains here — the games header redirects back into /games.
export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/games");
}
