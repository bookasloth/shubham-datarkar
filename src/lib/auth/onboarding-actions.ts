"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { safeNext } from "@/lib/auth/redirect";

/** Mirror of the DB rule in set_username. Returns an error string, or null if OK. */
export function validateUsername(raw: string): string | null {
  const v = raw.trim();
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(v)) {
    return "Username must be 3-30 chars: letters, numbers, dot, underscore.";
  }
  return null;
}

export type Step1State = { error: string } | { ok: true } | undefined;

/** Step 1: set username (via RPC) + referral source. */
export async function saveOnboardingStep1(
  _prev: Step1State,
  formData: FormData,
): Promise<Step1State> {
  const username = String(formData.get("username") ?? "");
  const referral = String(formData.get("referral") ?? "").trim();

  const invalid = validateUsername(username);
  if (invalid) return { error: invalid };

  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { error: nameErr } = await supabase.rpc("set_username", { p_username: username.trim() });
  if (nameErr) {
    return { error: /taken/i.test(nameErr.message) ? "That username is taken." : "Could not set username." };
  }

  if (referral) {
    await supabase.from("profiles").update({ referral_source: referral }).eq("id", user.id);
  }
  return { ok: true };
}

/** Finish onboarding: stamp onboarded_at, then land on the destination. */
export async function completeOnboarding(next: string | null): Promise<void> {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  }
  redirect(safeNext(next) ?? "/members");
}
