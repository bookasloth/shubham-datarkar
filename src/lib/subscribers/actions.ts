"use server";

import { headers } from "next/headers";
import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { getKitCredentials } from "@/lib/kit/store";
import { kitAddSubscriberToForm } from "@/lib/kit/client";
import { sendTemplate } from "@/lib/email/send-template";
import { newsletterWelcome, unsubscribed } from "@/lib/email/templates/newsletter";
import { EMAIL_RE } from "@/lib/validation/email";

/**
 * Fire-and-forget push to Kit. Never throws — a Kit outage must not fail a
 * signup that already saved to Supabase. No-ops until Kit is configured.
 */
async function pushToKit(email: string): Promise<void> {
  try {
    const creds = await getKitCredentials();
    if (!creds) return;
    const res = await kitAddSubscriberToForm(creds, email);
    if (!res.ok) console.warn("[subscribers] Kit push failed:", res.error);
  } catch (e) {
    console.warn("[subscribers] Kit push threw:", (e as Error).message);
  }
}

/** Public newsletter signup. Anon insert; duplicate email is treated as success. */
export async function subscribe(
  email: string,
  source = "newsletter-form",
): Promise<{ ok: boolean; error?: string }> {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, error: "Enter a valid email address." };

  // Anon INSERT is open by design (RLS allows it); rate-limit by IP so the list
  // can't be script-poisoned with junk addresses.
  if (!(await allow(`subscribe:${clientIp(await headers())}`, 5, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a minute." };
  }

  const { error } = await supabaseAnon().from("subscribers").insert({ email: e, source });
  if (error && error.code !== "23505") {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // Welcome a genuinely new subscriber only — `error === null` means the row was
  // inserted; 23505 is a duplicate re-submit and was already welcomed.
  if (!error) await sendWelcomeEmail(e);

  // Dual-write to Kit (fail-safe; idempotent for existing/duplicate emails).
  await pushToKit(e);

  return { ok: true };
}

/** Branded newsletter welcome. Fires once on a fresh subscribe. Fail-safe; no-ops without SMTP. */
async function sendWelcomeEmail(email: string): Promise<void> {
  try {
    await sendTemplate(email, newsletterWelcome({ email }));
  } catch (e) {
    console.warn("[subscribers] welcome email threw:", (e as Error).message);
  }
}

/**
 * Mark a subscriber unsubscribed. Returns a generic success regardless of
 * whether the email existed (no enumeration). Kit's own unsubscribe handles
 * the newsletter side; this updates our Supabase record.
 */
export async function unsubscribe(email: string): Promise<{ ok: boolean }> {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false };

  const { data, error } = await supabaseAdmin()
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("email", e)
    .select("id");
  if (error) console.warn("[subscribers] unsubscribe failed:", error.message);

  // Send the confirmation only if the address was actually on the list
  // (avoids emailing strangers who type a random address). Fail-safe.
  if (!error && (data?.length ?? 0) > 0) {
    await sendUnsubscribeEmail(e);
  }

  // Always report success — don't reveal whether the address was on the list.
  return { ok: true };
}

/** Branded "you've been unsubscribed" confirmation. Fail-safe; no-ops without SMTP. */
async function sendUnsubscribeEmail(email: string): Promise<void> {
  try {
    await sendTemplate(email, unsubscribed());
  } catch (e) {
    console.warn("[subscribers] unsubscribe email threw:", (e as Error).message);
  }
}
