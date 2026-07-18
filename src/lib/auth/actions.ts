"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { loginDestination, safeNext } from "@/lib/auth/redirect";
import { buildConfirmUrl } from "@/lib/auth/confirm-url";
import { sendTemplate } from "@/lib/email/send-template";
import { confirmEmail, forgotPassword, passwordChanged } from "@/lib/email/templates/auth";
import { isUnverifiedPastGrace } from "@/lib/auth/verification-gate";

export type SignInState = { error: string; needsVerification?: boolean } | undefined;
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
    // The ONLY correct-credential failure here is a cron-banned unverified
    // account (banned_until in the future): within-grace unverified users sign
    // in fine above, and past-grace ones are what the daily cron bans. Gate the
    // verify prompt on the live ban, not on email_confirmed_at — keying off the
    // latter would answer a wrong-password typo against any unverified account
    // differently from a confirmed/nonexistent one, enumerating unverified
    // emails and mis-messaging a genuine typo. Admin lookup runs only on failed
    // logins.
    const existing = await findAuthUser(email);
    const banned = existing?.banned_until && new Date(existing.banned_until) > new Date();
    if (banned) {
      return { error: "Verify your email before you log in.", needsVerification: true };
    }
    return { error: "Invalid email or password." };
  }

  // Signed in, but if the account is unverified past the 48h grace window, block
  // it now (covers accounts the daily cron hasn't banned yet).
  const u = data.user;
  if (u && isUnverifiedPastGrace({ email_confirmed_at: u.email_confirmed_at, created_at: u.created_at })) {
    await supabase.auth.signOut();
    return { error: "Verify your email before you log in.", needsVerification: true };
  }

  // redirect() throws to perform the redirect — keep it outside try/catch.
  redirect(loginDestination(next, data.user?.email));
}

/**
 * The auth user for this email (case-insensitive), or null.
 * ponytail: listUsers scans up to 1000 users; swap to a by-email RPC if the
 * user table outgrows that. Runs only on failed logins / resend requests.
 */
async function findAuthUser(email: string) {
  try {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = email.toLowerCase();
    return data?.users.find((x) => x.email?.toLowerCase() === target) ?? null;
  } catch {
    return null;
  }
}

/**
 * Everything signup does except decide where the user ends up: validate, mint the
 * account and its confirmation link, send the branded email.
 *
 * Split out because the account can be created from two places that need
 * different endings — the /login page redirects, the community join modal stays
 * put and shows "check your email" over the post being read. The rules (min
 * length, matching confirmation, branded mail) live here so the two can't drift.
 */
async function createAccount(fields: {
  email: string;
  password: string;
  name: string;
  next: string;
}): Promise<{ error: string } | { ok: true; safe: string | null }> {
  const { email, password, name } = fields;

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  // (confirm-password check removed — single-entry signup, requirement 2)

  // Mint the confirmation link ourselves (like password reset) so we can send a
  // branded "Confirm your email" instead of Supabase's default template. The link
  // lands on /auth/confirm, which verifies it and — on a signup type — fires the
  // welcome email. accountWelcome deliberately moves to confirm-time, not now.
  const origin_ = await origin();
  const safe = safeNext(fields.next);
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
  return { ok: true, safe };
}

/** Create a password account, then route to the return path or identity default. */
export async function signUp(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const result = await createAccount({
    email,
    password,
    name: String(formData.get("name") ?? "").trim(),
    next: String(formData.get("next") ?? ""),
  });
  if ("error" in result) return result;

  // Sign them in immediately so they can use the app during the 48h grace window.
  // Requires Supabase "Confirm email" enforcement OFF (see plan Global Constraints);
  // if it is still ON this returns an error and we fall back to the check banner.
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?check=1${result.safe ? `&next=${encodeURIComponent(result.safe)}` : ""}`);
  }

  const params = new URLSearchParams({ email });
  if (result.safe) params.set("next", result.safe);
  redirect(`/verify-email?${params.toString()}`);
}

export type JoinState = { error: string } | { ok: true; email: string } | undefined;

/**
 * Signup that stays on the page — the community join modal's action.
 *
 * Returns instead of redirecting, so the modal can swap to "check your email"
 * without navigating away from the post someone was reading. The account is
 * unconfirmed until they click the link, so this does NOT sign them in: the
 * caller gets `ok` to change what the modal shows, never a session.
 */
export async function joinFromCommunity(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await createAccount({
    email,
    password,
    name: String(formData.get("name") ?? "").trim(),
    next: String(formData.get("next") ?? ""),
  });
  if ("error" in result) return result;
  return { ok: true, email };
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

export type ResendState = { ok: true } | { error: string } | undefined;

/**
 * Re-mint and re-send the branded confirmation email for an unconfirmed account.
 * Always reports success (no enumeration), mirroring requestPasswordReset.
 */
export async function resendConfirmation(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  try {
    const user = await findAuthUser(email);
    // Only unconfirmed accounts need a resend. Silent no-op otherwise (no enumeration).
    if (user && !user.email_confirmed_at) {
      // Lift any 48h ban so the emailed link can establish a session when clicked.
      // The login gate still blocks their password login until they truly verify,
      // and the daily cron re-bans if they never do — so this temporary unban is safe.
      await supabaseAdmin().auth.admin.updateUserById(user.id, { ban_duration: "none" });

      const origin_ = await origin();
      const dest = loginDestination(null, email);
      // magiclink (NOT signup) so we pass no password — a signup-type link would
      // overwrite the existing user's password. Verifying a magiclink confirms the
      // email and signs them in, which is what resend needs.
      const { data, error } = await supabaseAdmin().auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${origin_}${dest}` },
      });
      const tokenHash = data?.properties?.hashed_token;
      if (!error && tokenHash) {
        const confirmUrl = buildConfirmUrl(origin_, tokenHash, "magiclink", dest);
        await sendTemplate(email, confirmEmail({ confirmUrl }));
      }
    }
  } catch {
    // Swallow — never reveal whether the address exists.
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/login");
}
