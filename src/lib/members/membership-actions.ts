"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { cancelSubscription } from "@/lib/razorpay/subscriptions";
import { giftMembership, revokeGift } from "@/lib/members/membership-server";
import { sendTemplate } from "@/lib/email/send-template";
import { membershipGift } from "@/lib/email/templates/membership";

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

export type GiftState = { ok: boolean; message: string } | undefined;

/**
 * Grant a lifetime gift membership on a plan, by email. Admin only.
 * Returns a state (not throws) so the form can show inline success/error.
 */
export async function giftMembershipByEmail(
  _prev: GiftState,
  formData: FormData,
): Promise<GiftState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const planKey = String(formData.get("plan_key") ?? "").trim();
  if (!email || !planKey) return { ok: false, message: "Email and plan are required." };

  const { data: plan } = await supabaseAdmin()
    .from("membership_plans")
    .select("key,name")
    .eq("key", planKey)
    .maybeSingle();
  if (!plan) return { ok: false, message: `Unknown plan: ${planKey}` };

  const userId = await findUserIdByEmail(email);
  if (!userId) {
    return { ok: false, message: `No account for ${email}. They must sign in once first.` };
  }

  try {
    await giftMembership(userId, planKey);
  } catch (e) {
    return { ok: false, message: `Could not gift: ${(e as Error).message}` };
  }

  const emailed = await sendGiftEmail(email, plan.name);
  revalidatePath("/admin/members");
  return {
    ok: true,
    message: `Gifted ${plan.name} to ${email}.${emailed ? " Congratulations email sent." : " (Email not sent — check SMTP settings.)"}`,
  };
}

/** Branded "you've been gifted a membership" email. Fail-safe; no-ops without SMTP. */
async function sendGiftEmail(email: string, planName: string): Promise<boolean> {
  try {
    const res = await sendTemplate(email, membershipGift({ planName }));
    return res.ok;
  } catch (e) {
    console.warn("[members] gift email threw:", (e as Error).message);
    return false;
  }
}

/** Revoke a gift membership by user id. Admin only. Never touches paid rows. */
export async function revokeGiftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) return;
  await revokeGift(userId);
  revalidatePath("/admin/members");
}
