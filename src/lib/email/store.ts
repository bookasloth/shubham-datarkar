import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { EmailCredentials, EmailFieldKey } from "./config";

/**
 * SMTP credential storage. Encrypted in Supabase Vault (secret 'email_smtp')
 * via service-role RPCs (set_email_secret / get_email_secret); non-secret
 * status in public.email_integration. Secret values never leave the server.
 */

export type EmailStatus = {
  configured: boolean;
  secure: boolean;
  setFields: EmailFieldKey[];
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
};

const CRED_KEYS: EmailFieldKey[] = [
  "host",
  "port",
  "user",
  "pass",
  "fromName",
  "fromEmail",
  "toEmail",
];

export async function getEmailCredentials(): Promise<EmailCredentials | null> {
  const { data, error } = await supabaseAdmin().rpc("get_email_secret");
  if (error) {
    console.warn("[email] get_email_secret failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data as EmailCredentials;
}

export async function getEmailStatus(): Promise<EmailStatus> {
  const fallback: EmailStatus = {
    configured: false,
    secure: true,
    setFields: [],
    lastTestAt: null,
    lastTestOk: null,
    lastTestMessage: null,
  };

  const { data, error } = await supabaseAdmin()
    .from("email_integration")
    .select("configured,last_test_at,last_test_ok,last_test_message")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[email] getEmailStatus failed; returning empty:", error.message);
    return fallback;
  }

  const creds = await getEmailCredentials();
  const setFields = creds ? CRED_KEYS.filter((k) => String(creds[k] ?? "").length > 0) : [];

  return {
    configured: Boolean(data?.configured),
    secure: creds ? creds.secure !== "false" : true,
    setFields,
    lastTestAt: data?.last_test_at ?? null,
    lastTestOk: data?.last_test_ok ?? null,
    lastTestMessage: data?.last_test_message ?? null,
  };
}

export async function saveEmailCredentials(
  creds: EmailCredentials,
): Promise<{ ok: boolean; error?: string }> {
  const admin = supabaseAdmin();

  const { error: secErr } = await admin.rpc("set_email_secret", { p_payload: creds });
  if (secErr) return { ok: false, error: secErr.message };

  const { error: metaErr } = await admin
    .from("email_integration")
    .update({ configured: true, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (metaErr) return { ok: false, error: metaErr.message };

  return { ok: true };
}

export async function recordEmailTest(ok: boolean, message: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("email_integration")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_ok: ok,
      last_test_message: message.slice(0, 300),
    })
    .eq("id", 1);
  if (error) console.warn("[email] recordEmailTest failed:", error.message);
}
