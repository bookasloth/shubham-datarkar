"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { safeMembersNext } from "./safe-next";

export type MembersAuthState = { error: string } | undefined;

export async function signUp(
  _prev: MembersAuthState,
  formData: FormData,
): Promise<MembersAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeMembersNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signIn(
  _prev: MembersAuthState,
  formData: FormData,
): Promise<MembersAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeMembersNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/members");
}
