import "server-only";

import { ZOHO_ACCOUNTS_BASE, type ZohoCredentials } from "./config";

/**
 * Zoho OAuth token exchange. Used by Test Connect (and later by the payment
 * session route) to mint a short-lived access token from the stored refresh
 * token. A successful exchange proves the Client ID / Secret / Refresh Token
 * are valid — without moving any money.
 */

export type TokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export async function fetchAccessToken(creds: ZohoCredentials): Promise<TokenResult> {
  const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;
  const body = new URLSearchParams({
    refresh_token: creds.refreshToken,
    client_id: creds.oauthClientId,
    client_secret: creds.oauthClientSecret,
    grant_type: "refresh_token",
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Zoho: ${(e as Error).message}` };
  }

  // Zoho returns HTTP 200 even for refresh-token errors (e.g. {"error":"invalid_code"}),
  // so success is determined by the presence of access_token, not the status alone.
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };

  if (json.access_token) return { ok: true, token: String(json.access_token) };
  if (json.error) return { ok: false, error: `Zoho rejected the credentials: ${json.error}` };
  if (!res.ok) return { ok: false, error: `Zoho returned HTTP ${res.status}.` };
  return { ok: false, error: "No access_token in Zoho's response." };
}
