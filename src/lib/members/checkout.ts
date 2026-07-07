/**
 * Client-side Razorpay Checkout for SUBSCRIPTIONS. Reuses the script loader
 * from the support flow; the confirm API route is the source of truth.
 */
import { loadRazorpayScript } from "@/lib/support/checkout";

type SubscriptionSuccess = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

export type SubscriptionCheckoutOutcome =
  | { status: "paid"; paymentId: string; subscriptionId: string; signature: string }
  | { status: "failed" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export async function openSubscriptionCheckout(s: {
  subscriptionId: string;
  keyId: string;
  planName: string;
  email?: string;
}): Promise<SubscriptionCheckoutOutcome> {
  try {
    await loadRazorpayScript();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  if (!window.Razorpay) {
    return { status: "error", message: "Razorpay checkout is unavailable right now." };
  }

  return new Promise<SubscriptionCheckoutOutcome>((resolve) => {
    let settled = false;
    const done = (o: SubscriptionCheckoutOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };

    const rzp = new window.Razorpay!({
      key: s.keyId,
      subscription_id: s.subscriptionId,
      name: "Shubham Datarkar",
      description: s.planName,
      prefill: { email: s.email ?? "" },
      theme: { color: "#fe5100" },
      handler: (resp: unknown) => {
        const r = resp as SubscriptionSuccess;
        done({
          status: "paid",
          paymentId: r.razorpay_payment_id,
          subscriptionId: r.razorpay_subscription_id,
          signature: r.razorpay_signature,
        });
      },
      modal: { ondismiss: () => done({ status: "cancelled" }) },
    });

    rzp.on("payment.failed", () => done({ status: "failed" }));
    rzp.open();
  });
}
