import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { razorpayKeyId } from "@/lib/razorpay/client";
import { createSubscription } from "@/lib/razorpay/subscriptions";
import { getPlanByKey, upsertPendingMembership } from "@/lib/members/membership-server";

export async function POST(request: Request) {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { planKey?: string };
  const plan = body.planKey ? await getPlanByKey(body.planKey) : null;
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  if (!plan.razorpay_plan_id) {
    return NextResponse.json({ error: "This plan is not ready for checkout yet." }, { status: 503 });
  }

  const created = await createSubscription(plan.razorpay_plan_id, plan.interval, {
    user_id: user.id,
    plan_key: plan.key,
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 502 });

  try {
    await upsertPendingMembership(user.id, plan.key, created.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ subscriptionId: created.id, keyId: razorpayKeyId() });
}
