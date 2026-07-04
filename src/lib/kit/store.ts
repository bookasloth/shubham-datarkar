import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { KitCredentials, KitFieldKey } from "./config";

/**
 * Kit credential storage. Mirrors the Email (SMTP) integration: the API key +
 * form id live encrypted in Supabase Vault (secret 'kit_email'), reached only through
 * the service-role RPCs (set_kit_secret / get_kit_secret). The
 * public.kit_integration row holds non-secret status. Secret values never
 * leave the server.
 */

export type KitStatus = {
  configured: boolean;
  setFields: KitFieldKey[];
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
};

const CRED_KEYS: KitFieldKey[] = ["apiKey", "formId"];

export async function getKitCredentials(): Promise<KitCredentials | null> {
  const { data, error } = await supabaseAdmin().rpc("get_kit_secret");
  if (error) {
    console.warn("[kit] get_kit_secret failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data as KitCredentials;
}

export async function getKitStatus(): Promise<KitStatus> {
  const fallback: KitStatus = {
    configured: false,
    setFields: [],
    lastTestAt: null,
    lastTestOk: null,
    lastTestMessage: null,
  };

  const { data, error } = await supabaseAdmin()
    .from("kit_integration")
    .select("configured,last_test_at,last_test_ok,last_test_message")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[kit] getKitStatus failed; returning empty:", error.message);
    return fallback;
  }

  const creds = await getKitCredentials();
  const setFields = creds ? CRED_KEYS.filter((k) => String(creds[k] ?? "").length > 0) : [];

  return {
    configured: Boolean(data?.configured),
    setFields,
    lastTestAt: data?.last_test_at ?? null,
    lastTestOk: data?.last_test_ok ?? null,
    lastTestMessage: data?.last_test_message ?? null,
  };
}

export async function saveKitCredentials(
  creds: KitCredentials,
): Promise<{ ok: boolean; error?: string }> {
  const admin = supabaseAdmin();

  const { error: secErr } = await admin.rpc("set_kit_secret", { p_payload: creds });
  if (secErr) return { ok: false, error: secErr.message };

  const { error: metaErr } = await admin
    .from("kit_integration")
    .update({ configured: true, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (metaErr) return { ok: false, error: metaErr.message };

  return { ok: true };
}

export async function recordKitTest(ok: boolean, message: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("kit_integration")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_ok: ok,
      last_test_message: message.slice(0, 300),
    })
    .eq("id", 1);
  if (error) console.warn("[kit] recordKitTest failed:", error.message);
}
