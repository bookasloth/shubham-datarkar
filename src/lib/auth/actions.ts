"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { loginDestination, safeNext } from "@/lib/auth/redirect";
import { buildConfirmUrl } from "@/lib/auth/confirm-url";
import { sendTemplate } from "@/lib/email/send-template";
import { confirmEmail, forgotPassword, passwordChanged } from "@/lib/email/templates/auth";

export type SignInState = { error: string } | undefined;
export type MagicLinkState = { ok: true } | { error: string } | undefined;
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
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // redirect() throws to perform the redirect — keep it outside try/catch.
  redirect(loginDestination(next, data.user?.email));
}

/** Create a password account, then route to the return path or identity default. */
export async function signUp(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password2") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (confirm && confirm !== password) {
    return { error: "Passwords don't match." };
  }

  // Mint the confirmation link ourselves (like password reset) so we can send a
  // branded "Confirm your email" instead of Supabase's default template. The link
  // lands on /auth/confirm, which verifies it and — on a signup type — fires the
  // welcome email. accountWelcome deliberately moves to confirm-time, not now.
  const origin_ = await origin();
  const safe = safeNext(next);
  const dest = loginDestination(safe, email);
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({
    type: "signup",
    email,
    password,
    // full_name (when given) lands in user_metadata so the confirm-time welcome
    // email and the profile row can greet the person by name.
    options: {
      redirectTo: `${origin_}${dest}`,
      ...(name ? { data: { full_name: name } } : {}),
    },
  });
  if (error) return { error: error.message };

  const tokenHash = data?.properties?.hashed_token;
  if (tokenHash) {
    try {
      const confirmUrl = buildConfirmUrl(origin_, tokenHash, "signup", dest);
      await sendTemplate(email, confirmEmail({ confirmUrl }));
    } catch {
      // Best-effort — the account exists even if mail fails.
    }
  }

  redirect(`/login?check=1${safe ? `&next=${encodeURIComponent(safe)}` : ""}`);
}

/**
 * Passwordless sign-in: email a one-time magic link. The link lands on
 * /auth/callback, which exchanges the code and routes by identity. Doubles as
 * signup (Supabase creates the user if none exists). Reports success even on
 * error-free unknown emails for the same reason password reset does.
 */
export async function signInWithMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const safe = safeNext(String(formData.get("next") ?? ""));
  const callback = `${await origin()}/auth/callback${safe ? `?next=${encodeURIComponent(safe)}` : ""}`;

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback },
  });
  if (error) return { error: "Could not send the link. Try again in a moment." };
  return { ok: true };
}

/**
 * Send a branded password-reset email via admin.generateLink. Always reports
 * success — we must not leak whether an account exists — so every failure is
 * swallowed. The link lands on /auth/confirm, which verifies the token_hash
 * and forwards to /reset-password; that route's form calls updatePassword.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  try {
    const origin_ = await origin();
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin_}/reset-password` },
    });
    const tokenHash = data?.properties?.hashed_token;
    if (!error && tokenHash) {
      const resetUrl = buildConfirmUrl(origin_, tokenHash, "recovery", "/reset-password");
      await sendTemplate(email, forgotPassword({ resetUrl }));
    }
  } catch {
    // Swallow — never reveal whether the address exists (no enumeration).
  }
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) await sendTemplate(user.email, passwordChanged({}));
  } catch {
    // Best-effort — password change must succeed even if mail fails.
  }

  redirect("/login?reset=1");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/login");
}
