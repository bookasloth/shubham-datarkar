"use server";

import { requireAdmin } from "@/lib/auth/session";
import { ZOHO_FIELDS, type ZohoCredentials, type ZohoMode } from "./config";
import {
  getZohoCredentials,
  recordZohoTest,
  saveZohoCredentials as persistCredentials,
} from "./store";
import { fetchAccessToken } from "./oauth";

export type SaveState = { ok: boolean; message: string } | undefined;

/**
 * Save the Zoho credentials. Auth is re-verified inside the action (the page
 * guard is not enough). A blank field keeps the existing stored value, so the
 * admin can update just the mode or a single secret without re-typing all of
 * them. On first configuration every field is required.
 */
export async function saveZohoCredentials(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  await requireAdmin();

  const existing = await getZohoCredentials();
  const mode: ZohoMode = formData.get("mode") === "live" ? "live" : "sandbox";

  const creds = { mode } as ZohoCredentials;
  const missing: string[] = [];

  for (const f of ZOHO_FIELDS) {
    const raw = String(formData.get(f.key) ?? "").trim();
    const value = raw || existing?.[f.key] || "";
    creds[f.key] = value;
    if (!value) missing.push(f.label);
  }

  if (missing.length) {
    return { ok: false, message: `Missing: ${missing.join(", ")}.` };
  }

  const res = await persistCredentials(creds);
  if (!res.ok) return { ok: false, message: `Save failed: ${res.error}` };

  return {
    ok: true,
    message: `Saved (mode: ${mode}). Run Test Connect to verify the credentials.`,
  };
}

export type TestState = { ok: boolean; message: string } | undefined;

/** Verify the stored credentials by exchanging the refresh token for a token. */
export async function testZohoConnection(
  _prev: TestState,
  _formData: FormData,
): Promise<TestState> {
  await requireAdmin();

  const creds = await getZohoCredentials();
  if (!creds) return { ok: false, message: "No credentials saved yet." };

  const result = await fetchAccessToken(creds);
  const message = result.ok
    ? `Connected — Zoho issued an access token (mode: ${creds.mode}).`
    : result.error;

  await recordZohoTest(result.ok, message);
  return { ok: result.ok, message };
}
