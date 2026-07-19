import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { membershipActivated, membershipRenewed, paymentFailed, membershipEnded } from "@/lib/email/templates/membership";

/** First charge (no prior period end) = activation; otherwise a renewal. */
export function classifyChargeKind(priorPeriodEnd: string | null): "activated" | "renewed" {
  return priorPeriodEnd ? "renewed" : "activated";
}

type Kind = "activated" | "renewed" | "failed" | "ended";

/** Best-effort: look up member email + plan name for a subscription and send. */
export async function notifyMembershipEvent(subscriptionId: string, kind: Kind): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const { data: m } = await admin
      .from("memberships")
      .select("user_id, plan_key")
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();
    if (!m?.user_id) return;

    const email = await getUserEmail(m.user_id);
    if (!email) return;

    const { data: plan } = await admin
      .from("membership_plans")
      .select("name")
      .eq("key", m.plan_key)
      .maybeSingle();
    const planName = plan?.name ?? "your plan";

    if (kind === "activated") await sendTemplate(email, membershipActivated({ planName }));
    else if (kind === "renewed") await sendTemplate(email, membershipRenewed({ planName }));
    else if (kind === "ended") await sendTemplate(email, membershipEnded({ planName }));
    else await sendTemplate(email, paymentFailed({ planName }));
  } catch (e) {
    console.warn("[members] notifyMembershipEvent failed:", (e as Error).message);
  }
}
