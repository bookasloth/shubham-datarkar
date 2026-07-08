import "server-only";

import { supabaseAdmin, supabaseAnon } from "@/lib/supabase/server";

export type MembershipPlan = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  amount: number; // paise
  interval: "monthly" | "yearly";
  razorpay_plan_id: string | null;
  active: boolean;
  sort: number;
};

const GRACE_MS = 3 * 24 * 60 * 60 * 1000; // renewal-retry grace

/** Purchasable (paid) plans only — excludes the Free baseline row (amount 0). */
export async function getActivePlans(): Promise<MembershipPlan[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("membership_plans")
      .select("id,key,name,description,amount,interval,razorpay_plan_id,active,sort")
      .eq("active", true)
      .gt("amount", 0)
      .order("sort");
    if (error) throw error;
    return (data ?? []) as MembershipPlan[];
  } catch (e) {
    console.warn("[members] plans fetch failed", e);
    return [];
  }
}

export async function getPlanByKey(key: string): Promise<MembershipPlan | null> {
  const plans = await getActivePlans();
  return plans.find((p) => p.key === key) ?? null;
}

/** Reserve a membership row while checkout is in flight. */
export async function upsertPendingMembership(
  userId: string,
  planKey: string,
  subscriptionId: string,
): Promise<void> {
  const { error } = await supabaseAdmin().from("memberships").upsert(
    {
      user_id: userId,
      plan_key: planKey,
      status: "pending",
      razorpay_subscription_id: subscriptionId,
      current_period_end: null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

/** First activation after a verified Checkout success; webhook corrects the period end later. */
export async function activateMembership(
  userId: string,
  subscriptionId: string,
  interval: "monthly" | "yearly",
): Promise<boolean> {
  const periodMs = (interval === "monthly" ? 31 : 366) * 24 * 60 * 60 * 1000;
  const { data, error } = await supabaseAdmin()
    .from("memberships")
    .update({
      status: "active",
      current_period_end: new Date(Date.now() + periodMs + GRACE_MS).toISOString(),
    })
    .eq("user_id", userId)
    .eq("razorpay_subscription_id", subscriptionId)
    .select("id");
  if (error) {
    console.warn("[members] activate failed", error);
    return false;
  }
  return !!data?.length;
}

/** Webhook-driven state sync, idempotent by subscription id. */
export async function syncMembershipFromWebhook(
  subscriptionId: string,
  status: "active" | "cancelled" | "expired",
  currentEndUnixSeconds?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (currentEndUnixSeconds) {
    patch.current_period_end = new Date(
      currentEndUnixSeconds * 1000 + GRACE_MS,
    ).toISOString();
  }
  const { error } = await supabaseAdmin()
    .from("memberships")
    .update(patch)
    .eq("razorpay_subscription_id", subscriptionId);
  if (error) console.warn("[members] webhook sync failed", error);
}
