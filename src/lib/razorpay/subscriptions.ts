import "server-only";

/**
 * Razorpay Subscriptions REST client. Same no-SDK approach as client.ts:
 * plain fetch + HTTP Basic auth, server-only.
 */

const SUBSCRIPTIONS_URL = "https://api.razorpay.com/v1/subscriptions";

function basicAuth(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Missing Razorpay credentials");
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

type RazorpayError = { error?: { description?: string } };

export type CreateSubscriptionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Create a subscription for a dashboard-defined plan.
 * total_count is Razorpay's max billing cycles: 10 years' worth either way.
 */
export async function createSubscription(
  planId: string,
  interval: "monthly" | "yearly",
  notes?: Record<string, string>,
): Promise<CreateSubscriptionResult> {
  let res: Response;
  try {
    res = await fetch(SUBSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: interval === "monthly" ? 120 : 10,
        customer_notify: 1,
        notes: notes ?? {},
      }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Razorpay: ${(e as Error).message}` };
  }

  const json = (await res.json().catch(() => ({}))) as { id?: string } & RazorpayError;
  if (!res.ok || !json.id) {
    return { ok: false, error: json.error?.description || `Razorpay returned HTTP ${res.status}.` };
  }
  return { ok: true, id: String(json.id) };
}

/** Cancel at cycle end by default so access runs out the paid period. */
export async function cancelSubscription(
  subscriptionId: string,
  atCycleEnd = true,
): Promise<{ ok: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`${SUBSCRIPTIONS_URL}/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Razorpay: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as RazorpayError;
    return { ok: false, error: json.error?.description || `Razorpay returned HTTP ${res.status}.` };
  }
  return { ok: true };
}
