"use server";

import { supabaseAnon } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public newsletter signup. Anon insert; duplicate email is treated as success. */
export async function subscribe(
  email: string,
  source = "newsletter-form",
): Promise<{ ok: boolean; error?: string }> {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, error: "Enter a valid email address." };

  const { error } = await supabaseAnon().from("subscribers").insert({ email: e, source });
  if (error) {
    if (error.code === "23505") return { ok: true }; // already subscribed
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true };
}
