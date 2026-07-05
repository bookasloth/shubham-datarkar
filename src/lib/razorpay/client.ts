import "server-only";

/**
 * Razorpay REST client (Orders API). No SDK — plain fetch with HTTP Basic auth
 * (key_id:key_secret). Server-only: the secret must never reach the browser.
 */

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

function keyId(): string {
  const v = process.env.RAZORPAY_KEY_ID;
  if (!v) throw new Error("Missing RAZORPAY_KEY_ID");
  return v;
}
function keySecret(): string {
  const v = process.env.RAZORPAY_KEY_SECRET;
  if (!v) throw new Error("Missing RAZORPAY_KEY_SECRET");
  return v;
}

/** Public key id, returned to the client to open Checkout. */
export function razorpayKeyId(): string {
  return keyId();
}

export type CreateOrderResult = { ok: true; id: string } | { ok: false; error: string };

export async function createOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResult> {
  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Razorpay: ${(e as Error).message}` };
  }

  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { description?: string };
  };
  if (!res.ok || !json.id) {
    return { ok: false, error: json.error?.description || `Razorpay returned HTTP ${res.status}.` };
  }
  return { ok: true, id: String(json.id) };
}
