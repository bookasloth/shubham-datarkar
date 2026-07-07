"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/razorpay/subscriptions";

export type CancelState = { error?: string; ok?: boolean } | undefined;

/** Cancel at cycle end: Razorpay stops renewals; access runs out the paid period. */
export async function cancelMembership(
  _prev: CancelState,
  _formData: FormData,
): Promise<CancelState> {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("razorpay_subscription_id,status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "No membership found." };
  if (membership.status === "cancelled") return { ok: true };

  if (membership.razorpay_subscription_id) {
    const result = await cancelSubscription(membership.razorpay_subscription_id, true);
    if (!result.ok) return { error: result.error ?? "Could not cancel with Razorpay." };
  }

  const { error } = await supabaseAdmin()
    .from("memberships")
    .update({ status: "cancelled" })
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/members/account");
  return { ok: true };
}
