"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type SignInState = { error: string } | undefined;

/** Used with React's useActionState in the login form. */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // redirect() throws to perform the redirect — keep it outside try/catch.
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/login");
}
