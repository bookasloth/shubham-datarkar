// src/lib/support/checkout.ts
/**
 * Client-side Razorpay Checkout. Loads checkout.js once, opens the modal for a
 * created order, and reports the outcome. The confirm route (server) is the
 * source of truth — a "paid" outcome here carries the fields it must verify.
 */

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load the Razorpay checkout script."));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type CheckoutSession = {
  orderId: string;
  keyId: string;
  amount: number; // rupees
  currency: string;
  email: string;
  name?: string;
};

export type CheckoutOutcome =
  | { status: "paid"; orderId: string; paymentId: string; signature: string }
  | { status: "failed"; orderId: string; paymentId?: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export async function openRazorpayCheckout(s: CheckoutSession): Promise<CheckoutOutcome> {
  try {
    await loadScript();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  if (!window.Razorpay) {
    return { status: "error", message: "Razorpay checkout is unavailable right now." };
  }

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const done = (o: CheckoutOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };

    const rzp = new window.Razorpay!({
      key: s.keyId,
      order_id: s.orderId,
      amount: Math.round(s.amount * 100),
      currency: s.currency,
      name: "Shubham Datarkar",
      description: "Support",
      prefill: { name: s.name ?? "", email: s.email },
      theme: { color: "#ff4800" },
      handler: (resp: unknown) => {
        const r = resp as RazorpaySuccess;
        done({
          status: "paid",
          orderId: r.razorpay_order_id,
          paymentId: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => done({ status: "cancelled" }),
      },
    });

    rzp.on("payment.failed", (resp: unknown) => {
      const r = (resp as { error?: { metadata?: { payment_id?: string } } })?.error;
      done({ status: "failed", orderId: s.orderId, paymentId: r?.metadata?.payment_id });
    });

    rzp.open();
  });
}
