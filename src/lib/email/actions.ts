"use server";

import { requireAdmin } from "@/lib/auth/session";
import { EMAIL_FIELDS, type EmailCredentials } from "./config";
import {
  getEmailCredentials,
  recordEmailTest,
  saveEmailCredentials as persistCredentials,
} from "./store";
import { verifyEmail } from "./smtp";

export type SaveState = { ok: boolean; message: string } | undefined;

export async function saveEmailCredentials(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  await requireAdmin();

  const existing = await getEmailCredentials();
  const secure = formData.get("secure") === "false" ? "false" : "true";

  const creds = { secure } as EmailCredentials;
  const missing: string[] = [];

  for (const f of EMAIL_FIELDS) {
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

  return { ok: true, message: "Saved. Run Test Connect to verify the SMTP login." };
}

export type TestState = { ok: boolean; message: string } | undefined;

export async function testEmailConnection(
  _prev: TestState,
  _formData: FormData,
): Promise<TestState> {
  await requireAdmin();

  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, message: "No credentials saved yet." };

  const result = await verifyEmail(creds);
  await recordEmailTest(result.ok, result.message);
  return result;
}
