"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { cancelSubscription } from "@/lib/razorpay/subscriptions";
import { giftMembership, revokeGift } from "@/lib/members/membership-server";

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

/* ---- admin: gift memberships (superadmin grants a plan by email) ---- */

/** Look up an auth user by email (case-insensitive). Null if no account yet. */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = email.toLowerCase();
  return data?.users.find((u) => u.email?.toLowerCase() === target)?.id ?? null;
}

/** Grant a lifetime gift membership on a plan, by email. Admin only. */
export async function giftMembershipByEmail(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const planKey = String(formData.get("plan_key") ?? "").trim();
  if (!email || !planKey) throw new Error("Email and plan are required.");

  const { data: plan } = await supabaseAdmin()
    .from("membership_plans")
    .select("key")
    .eq("key", planKey)
    .maybeSingle();
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);

  const userId = await findUserIdByEmail(email);
  if (!userId) throw new Error(`No account for ${email}. They must sign in once first.`);

  await giftMembership(userId, planKey);
  revalidatePath("/admin/members");
}

/** Revoke a gift membership by user id. Admin only. Never touches paid rows. */
export async function revokeGiftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) return;
  await revokeGift(userId);
  revalidatePath("/admin/members");
}
