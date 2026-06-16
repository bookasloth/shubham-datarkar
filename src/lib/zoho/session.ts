import "server-only";

import { zohoPaymentsBase, type ZohoCredentials } from "./config";

/**
 * Create a Zoho Payments session (server-side, with a fresh access token).
 * Returns the payments_session_id + access_key the client widget needs.
 *
 * Endpoint: POST {base}/api/v1/paymentsessions?account_id=...
 * Auth:     Authorization: Zoho-oauthtoken {token}
 */

export type SessionResult =
  | { ok: true; sessionId: string; accessKey: string | null }
  | { ok: false; error: string };

export async function createPaymentSession(
  creds: ZohoCredentials,
  accessToken: string,
  params: {
    amount: number;
    currency: string;
    description: string;
    referenceNumber: string;
  },
): Promise<SessionResult> {
  const url = `${zohoPaymentsBase(creds.mode)}/api/v1/paymentsessions?account_id=${encodeURIComponent(
    creds.accountId,
  )}`;

  const body = {
    amount: params.amount,
    currency: params.currency,
    description: params.description.slice(0, 100),
    reference_number: params.referenceNumber,
    meta_data: [{ key: "support_id", value: params.referenceNumber }],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Zoho: ${(e as Error).message}` };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg = (json?.message as string) || `Zoho returned HTTP ${res.status}.`;
    return { ok: false, error: String(msg) };
  }

  // Zoho wraps the result in `payments_session`; fall back defensively.
  const session = (json.payments_session ?? json.payment_session ?? json) as Record<string, unknown>;
  const sessionId = session?.payments_session_id ?? session?.payment_session_id;
  if (!sessionId) return { ok: false, error: "No payments_session_id in Zoho's response." };

  return {
    ok: true,
    sessionId: String(sessionId),
    accessKey: session?.access_key ? String(session.access_key) : null,
  };
}
