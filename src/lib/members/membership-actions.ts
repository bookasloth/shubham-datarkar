"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { cancelSubscription } from "@/lib/razorpay/subscriptions";
import { giftMembership, revokeGift } from "@/lib/members/membership-server";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail } from "@/lib/email/template";

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
    const creds = await getEmailCredentials();
    if (!creds) return false;
    const res = await sendEmail(creds, {
      to: email,
      subject: `You've been gifted ${planName}`,
      text: `Congratulations! You've been gifted ${planName} — lifetime access to all premium member resources. Sign in at https://shubhamdatarkar.com/members to start.`,
      html: renderEmail({
        preheader: `You've been gifted ${planName} — lifetime premium access.`,
        headerTagline: "A gift for you",
        title: "Congratulations — you've been gifted premium.",
        bodyHtml:
          `<p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">You've been gifted <strong>${planName}</strong> — lifetime access to every premium resource, template, download, and tool in the members library.</p>` +
          `<p style="margin:0 0 22px;font-size:14px;color:#2d2d2d;line-height:1.7">Sign in with this email to unlock it. Nothing to pay, now or ever.</p>`,
        cta: { label: "Open Members", href: "https://shubhamdatarkar.com/members" },
      }),
    });
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
