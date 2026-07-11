"use server";

import { headers } from "next/headers";
import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { getKitCredentials } from "@/lib/kit/store";
import { kitAddSubscriberToForm } from "@/lib/kit/client";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail, EMAIL_BRAND } from "@/lib/email/template";
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
    const creds = await getEmailCredentials();
    if (!creds) return;
    await sendEmail(creds, {
      to: email,
      subject: "Welcome aboard — you're in",
      text: "You're in. Expect ad breakdowns, SEO and growth frameworks, build logs, and subscriber-only resources. Access your exclusive goodies at https://shubhamdatarkar.com/subscriber-assets",
      html: renderEmail({
        preheader: "You're in. Strategy, stories, and subscriber-only assets await.",
        title: "Welcome aboard,",
        bodyHtml:
          `<p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">You just joined a circle of builders, marketers, and thinkers who care about one thing: creating work that converts and compounds.</p>` +
          `<h2 style="margin:28px 0 10px;font-size:18px;font-weight:600;color:#202124">Here's what to expect</h2>` +
          `<ul style="margin:0 0 24px 22px;padding:0;font-size:14px;color:#3c4043;line-height:1.6">` +
          `<li>Deep dives on ads that work (and why they work).</li>` +
          `<li>Actionable SEO and growth frameworks you can implement immediately.</li>` +
          `<li>Build logs from my ventures and experiments.</li>` +
          `<li>Occasional hard truths about marketing most people won't say publicly.</li>` +
          `</ul>` +
          `<p style="margin:0;font-size:14px;color:#2d2d2d;line-height:1.7">And because you're a subscriber, you get access to exclusive resources I don't share anywhere else.</p>`,
        cta: { label: "Access Exclusive Goodies", href: "https://shubhamdatarkar.com/subscriber-assets" },
        heroImageUrl: EMAIL_BRAND.welcomeGif,
      }),
    });
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
