"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type SignInState = { error: string } | undefined;
export type ResetRequestState = { ok: true } | { error: string } | undefined;
export type UpdatePasswordState = { error: string } | undefined;

/** Request origin (proto+host) for building absolute email redirect URLs. */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // Route by identity. Non-admins have no place in /admin — requireAdmin would
  // bounce them straight back to /login, an infinite loop. Send the single
  // admin to the console; everyone else to their member workspace. Strict
  // email match mirrors getAdminUser so this never disagrees with the gate.
  // redirect() throws to perform the redirect — keep it outside try/catch.
  const isAdmin = !!process.env.ADMIN_EMAIL && data.user?.email === process.env.ADMIN_EMAIL;
  redirect(isAdmin ? "/admin" : "/members");
}

/**
 * Send a password-reset email. Always reports success — Supabase does not error
 * on an unknown address, and we must not leak whether an account exists. The
 * link lands on /reset-password?code=…; that route's form calls updatePassword.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await supabaseAuthServer();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/reset-password`,
  });
  return { ok: true };
}

/**
 * Complete a reset. The emailed link carries a one-time `code`; exchange it for
 * a recovery session (PKCE verifier is in this browser's server cookie from the
 * request step), then set the new password. Code is single-use, so the exchange
 * lives here — on submit — not on page render.
 */
export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const code = String(formData.get("code") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await supabaseAuthServer();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { error: "This reset link is invalid or expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Could not update password. Request a new reset link." };

  redirect("/login?reset=1");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/login");
}
