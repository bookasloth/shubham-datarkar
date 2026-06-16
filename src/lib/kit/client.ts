import "server-only";

import { KIT_API_BASE, type KitCredentials } from "./config";

/**
 * Kit (ConvertKit) v4 API client. Auth via the `X-Kit-Api-Key` header.
 */

function headers(apiKey: string) {
  return {
    "X-Kit-Api-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Add a subscriber to the configured form by email. This endpoint creates the
 * subscriber if they don't exist and adds them to the form (triggering Kit's
 * opt-in/incentive email). Idempotent for existing subscribers.
 */
export async function kitAddSubscriberToForm(
  creds: KitCredentials,
  email: string,
  firstName?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!creds.formId) return { ok: false, error: "No Kit form id configured." };

  const url = `${KIT_API_BASE}/forms/${encodeURIComponent(creds.formId)}/subscribers`;
  const body: Record<string, unknown> = { email_address: email };
  if (firstName) body.first_name = firstName;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: headers(creds.apiKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Kit: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { errors?: unknown; message?: string };
    const detail =
      (Array.isArray(json.errors) && json.errors.join("; ")) ||
      json.message ||
      `Kit returned HTTP ${res.status}.`;
    return { ok: false, error: String(detail) };
  }
  return { ok: true };
}

/** Verify the API key by hitting the account endpoint. */
export async function kitTestConnection(
  creds: KitCredentials,
): Promise<{ ok: boolean; message: string }> {
  let res: Response;
  try {
    res = await fetch(`${KIT_API_BASE}/account`, {
      method: "GET",
      headers: headers(creds.apiKey),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, message: `Network error reaching Kit: ${(e as Error).message}` };
  }

  if (res.status === 401) return { ok: false, message: "Kit rejected the API key (401)." };
  if (!res.ok) return { ok: false, message: `Kit returned HTTP ${res.status}.` };

  const json = (await res.json().catch(() => ({}))) as { account?: { name?: string } };
  const name = json.account?.name;
  return { ok: true, message: name ? `Connected to Kit account "${name}".` : "Connected to Kit." };
}
