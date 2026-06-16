import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ZohoCredentials, ZohoFieldKey, ZohoMode } from "./config";

/**
 * Credential storage for Zoho Payments.
 *
 * Secrets live encrypted at rest in Supabase Vault (one JSON secret named
 * `zoho_payments`), reached only through service-role RPCs
 * (`set_zoho_secret` / `get_zoho_secret`). Non-secret status (mode, configured
 * flag, last test result) lives in the `public.zoho_integration` metadata row,
 * readable by authenticated admins.
 *
 * Raw secret values NEVER leave the server — the admin page is handed a
 * `ZohoStatus` (field names + flags only), not the values themselves.
 */

export type ZohoStatus = {
  configured: boolean;
  mode: ZohoMode;
  /** Credential field keys that currently hold a stored value (no values). */
  setFields: ZohoFieldKey[];
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
};

const CRED_KEYS: ZohoFieldKey[] = [
  "accountId",
  "apiKey",
  "oauthClientId",
  "oauthClientSecret",
  "refreshToken",
  "webhookSecret",
];

/** Decrypt + return the full credential set, or null if none/error. Server-only. */
export async function getZohoCredentials(): Promise<ZohoCredentials | null> {
  const { data, error } = await supabaseAdmin().rpc("get_zoho_secret");
  if (error) {
    console.warn("[zoho] get_zoho_secret failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data as ZohoCredentials;
}

/** Status for the admin UI — never includes secret values. */
export async function getZohoStatus(): Promise<ZohoStatus> {
  const fallback: ZohoStatus = {
    configured: false,
    mode: "sandbox",
    setFields: [],
    lastTestAt: null,
    lastTestOk: null,
    lastTestMessage: null,
  };

  const { data, error } = await supabaseAdmin()
    .from("zoho_integration")
    .select("mode,configured,last_test_at,last_test_ok,last_test_message")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[zoho] getZohoStatus failed; returning empty:", error.message);
    return fallback;
  }

  const creds = await getZohoCredentials();
  const setFields = creds
    ? CRED_KEYS.filter((k) => String(creds[k] ?? "").length > 0)
    : [];

  return {
    configured: Boolean(data?.configured),
    mode: (data?.mode as ZohoMode) ?? creds?.mode ?? "sandbox",
    setFields,
    lastTestAt: data?.last_test_at ?? null,
    lastTestOk: data?.last_test_ok ?? null,
    lastTestMessage: data?.last_test_message ?? null,
  };
}

/** Encrypt + persist credentials, then mark the integration configured. */
export async function saveZohoCredentials(
  creds: ZohoCredentials,
): Promise<{ ok: boolean; error?: string }> {
  const admin = supabaseAdmin();

  const { error: secErr } = await admin.rpc("set_zoho_secret", { p_payload: creds });
  if (secErr) return { ok: false, error: secErr.message };

  const { error: metaErr } = await admin
    .from("zoho_integration")
    .update({ mode: creds.mode, configured: true, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (metaErr) return { ok: false, error: metaErr.message };

  return { ok: true };
}

/** Record the outcome of a Test Connect run on the metadata row. */
export async function recordZohoTest(ok: boolean, message: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("zoho_integration")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_ok: ok,
      last_test_message: message.slice(0, 300),
    })
    .eq("id", 1);
  if (error) console.warn("[zoho] recordZohoTest failed:", error.message);
}
