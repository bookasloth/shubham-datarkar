"use server";

import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { getKitCredentials } from "@/lib/kit/store";
import { kitAddSubscriberToForm } from "@/lib/kit/client";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail, EMAIL_BRAND } from "@/lib/email/template";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { error } = await supabaseAnon().from("subscribers").insert({ email: e, source });
  if (error && error.code !== "23505") {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // Dual-write to Kit (fail-safe; idempotent for existing/duplicate emails).
  await pushToKit(e);

  return { ok: true };
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
    const creds = await getEmailCredentials();
    if (!creds) return;
    await sendEmail(creds, {
      to: email,
      subject: "You've been unsubscribed",
      text: "You've been unsubscribed — you'll no longer receive the newsletter. No hard feelings. Re-subscribe anytime at https://shubhamdatarkar.com/subscribe",
      html: renderEmail({
        preheader: "You've successfully unsubscribed.",
        headerTagline: "Subscription Updated",
        title: "You've been unsubscribed.",
        bodyHtml:
          `<p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">You will no longer receive strategy breakdowns, build logs, or growth frameworks from me.</p>` +
          `<p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">No hard feelings.</p>` +
          `<p style="margin:0 0 22px;font-size:14px;color:#2d2d2d;line-height:1.7">If you ever decide to build again, you know where to find me.</p>`,
        cta: { label: "Re-Subscribe", href: "https://shubhamdatarkar.com/subscribe" },
        afterCta: `<p style="margin:0;font-size:12px;color:#9aa0a6;line-height:1.6">Your inbox should only contain what's valuable to you. I respect that.</p>`,
        heroImageUrl: EMAIL_BRAND.unsubscribeGif,
      }),
    });
  } catch (e) {
    console.warn("[subscribers] unsubscribe email threw:", (e as Error).message);
  }
}
