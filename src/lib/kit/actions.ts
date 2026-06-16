"use server";

import { requireAdmin } from "@/lib/auth/session";
import { KIT_FIELDS, type KitCredentials } from "./config";
import {
  getKitCredentials,
  recordKitTest,
  saveKitCredentials as persistCredentials,
} from "./store";
import { kitTestConnection } from "./client";

export type SaveState = { ok: boolean; message: string } | undefined;

/**
 * Save the Kit credentials. Auth re-verified in the action. A blank field
 * keeps the existing stored value; on first configuration both are required.
 */
export async function saveKitCredentials(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  await requireAdmin();

  const existing = await getKitCredentials();
  const creds = {} as KitCredentials;
  const missing: string[] = [];

  for (const f of KIT_FIELDS) {
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

  return { ok: true, message: "Saved. Run Test Connect to verify the API key." };
}

export type TestState = { ok: boolean; message: string } | undefined;

export async function testKitConnection(
  _prev: TestState,
  _formData: FormData,
): Promise<TestState> {
  await requireAdmin();

  const creds = await getKitCredentials();
  if (!creds) return { ok: false, message: "No credentials saved yet." };

  const result = await kitTestConnection(creds);
  await recordKitTest(result.ok, result.message);
  return { ok: result.ok, message: result.message };
}
