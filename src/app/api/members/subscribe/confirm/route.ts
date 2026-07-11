import { NextResponse } from "next/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { verifySubscriptionSignature } from "@/lib/razorpay/subscription-verify";
import { activateMembership } from "@/lib/members/membership-server";

export async function POST(request: Request) {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    paymentId?: string;
    subscriptionId?: string;
    signature?: string;
  };
  const { paymentId, subscriptionId, signature } = body;
  if (!paymentId || !subscriptionId || !signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  if (!verifySubscriptionSignature(paymentId, subscriptionId, signature)) {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  // Scoped to this user + this subscription: a stranger's valid signature
  // cannot activate someone else's row. The period is derived server-side from
  // the plan, so the client can't influence how long access lasts.
  const activated = await activateMembership(user.id, subscriptionId);
  if (!activated) {
    return NextResponse.json({ error: "No matching membership found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
