/**
 * Client-side Zoho Payments checkout widget. Loads the Zoho script once, opens
 * the widget for a created payment session, and reports the outcome. The DB
 * row is the source of truth (flipped by the webhook); a "paid" outcome here
 * just drives the optimistic thank-you.
 */

type ZPaymentsInstance = {
  requestPaymentMethod: (opts: Record<string, unknown>) => Promise<{ payment_id?: string }>;
  close: () => Promise<void>;
};

declare global {
  interface Window {
    ZPayments?: new (config: Record<string, unknown>) => ZPaymentsInstance;
  }
}

const SCRIPT_SRC = "https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.ZPayments) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load the Zoho checkout script."));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type CheckoutSession = {
  paymentsSessionId: string;
  accountId: string;
  apiKey: string;
  amount: number;
  currency: string;
  symbol: string;
  email: string;
  name?: string;
};

export type CheckoutOutcome =
  | { status: "paid"; paymentId?: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export async function openZohoCheckout(s: CheckoutSession): Promise<CheckoutOutcome> {
  try {
    await loadScript();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  if (!window.ZPayments) {
    return { status: "error", message: "Zoho checkout is unavailable right now." };
  }

  const instance = new window.ZPayments({
    account_id: s.accountId,
    domain: "IN",
    otherOptions: { api_key: s.apiKey },
  });

  try {
    const res = await instance.requestPaymentMethod({
      amount: String(s.amount),
      currency_code: s.currency,
      payments_session_id: s.paymentsSessionId,
      currency_symbol: s.symbol,
      business: "Shubham Datarkar",
      description: "Support",
      address: { name: s.name ?? "", email: s.email },
    });
    return { status: "paid", paymentId: res?.payment_id };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "widget_closed") return { status: "cancelled" };
    return { status: "error", message: e?.message ? String(e.message) : "Payment failed." };
  } finally {
    try {
      await instance.close();
    } catch {
      /* widget already closed */
    }
  }
}
