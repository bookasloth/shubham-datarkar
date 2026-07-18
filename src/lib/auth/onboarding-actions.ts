"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { safeNext } from "@/lib/auth/redirect";
import { validateUsername } from "@/lib/auth/username";

// validateUsername lives in a plain module (not this "use server" file) so the
// client wizard can import it synchronously — re-exporting it here would turn it
// back into a server action. Imported for the server-side guard below.

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
