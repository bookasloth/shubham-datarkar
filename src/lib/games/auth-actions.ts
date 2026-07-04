"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type GamesAuthState = { error: string } | undefined;

/** Only allow same-app return paths; never an open redirect. */
function safeNext(raw: FormDataEntryValue | null): string {
  const v = String(raw ?? "");
  return v === "/games" || v.startsWith("/games/") ? v : "/games";
}

export async function signUp(
  _prev: GamesAuthState,
  formData: FormData,
): Promise<GamesAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signIn(
  _prev: GamesAuthState,
  formData: FormData,
): Promise<GamesAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/games");
}
