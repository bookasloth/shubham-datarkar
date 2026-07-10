"use server";

import { cookies } from "next/headers";
import { randomInt } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail } from "@/lib/email/template";
import { signIdentity, verifyToken, hashOtp, type CommenterIdentity } from "./comment-auth-crypto";
import { EMAIL_RE } from "@/lib/validation/email";

const COOKIE = "sd_commenter";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends
const MAX_ATTEMPTS = 5;

export type OtpState = { ok: boolean; message: string };

function normalize(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

/** Issue a 6-digit OTP and email it. Rate-limited; never leaks the code. */
export async function requestOtp(emailRaw: string): Promise<OtpState> {
  const email = normalize(emailRaw);
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };

  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, message: "Verification is temporarily unavailable." };

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("comment_verifications")
    .select("last_sent_at")
    .eq("email", email)
    .maybeSingle();
  if (existing?.last_sent_at) {
    const since = Date.now() - new Date(existing.last_sent_at as string).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      return { ok: false, message: "Hold on a moment before requesting another code." };
    }
  }

  const code = String(randomInt(100000, 1_000_000));
  const now = new Date();
  const { error } = await admin.from("comment_verifications").upsert({
    email,
    code_hash: hashOtp(code),
    expires_at: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    last_sent_at: now.toISOString(),
  });
  if (error) {
    console.warn("[comment-auth] upsert failed:", error.message);
    return { ok: false, message: "Could not start verification. Try again." };
  }

  const send = await sendEmail(creds, {
    to: email,
    subject: `Your comment verification code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: renderEmail({
      preheader: "Your comment verification code",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Verify your email",
      bodyHtml: `<p style="margin:0 0 12px;font-size:14px;color:#2d2d2d;line-height:1.7">Enter this code to post your comment:</p><p style="margin:0 0 18px;font-size:28px;font-weight:700;letter-spacing:4px;color:#2d2d2d">${code}</p><p style="margin:0;font-size:13px;color:#5f6368">It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    }),
  });
  if (!send.ok) {
    console.warn("[comment-auth] otp email failed:", send.error);
    return { ok: false, message: "Could not send the code. Check the email and try again." };
  }

  return { ok: true, message: "Code sent. Check your inbox." };
}

/** Verify the OTP; on success set the signed session cookie. */
export async function verifyOtp(emailRaw: string, nameRaw: string, code: string): Promise<OtpState> {
  const email = normalize(emailRaw);
  const name = String(nameRaw ?? "").trim().slice(0, 80) || "Anonymous";
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("comment_verifications")
    .select("code_hash,expires_at,attempts")
    .eq("email", email)
    .maybeSingle();

  if (!row) return { ok: false, message: "Request a code first." };
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { ok: false, message: "Code expired. Request a new one." };
  }
  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    return { ok: false, message: "Too many attempts. Request a new code." };
  }

  if (hashOtp(String(code).trim()) !== row.code_hash) {
    await admin
      .from("comment_verifications")
      .update({ attempts: (row.attempts as number) + 1 })
      .eq("email", email);
    return { ok: false, message: "Incorrect code." };
  }

  await admin.from("comment_verifications").delete().eq("email", email);

  const identity: CommenterIdentity = { email, name, iat: Date.now() };
  const jar = await cookies();
  jar.set(COOKIE, signIdentity(identity), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { ok: true, message: `Verified as ${name}.` };
}

/** Read the current verified commenter from the cookie, or null. */
export async function getVerifiedCommenter(): Promise<CommenterIdentity | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

/** Clear the commenter session. */
export async function signOutCommenter(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
