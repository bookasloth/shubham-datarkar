"use server";

import { supabaseAnon } from "@/lib/supabase/server";
import { getKitCredentials } from "@/lib/kit/store";
import { kitAddSubscriberToForm } from "@/lib/kit/client";

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
