"use server";

import { requireAdmin } from "@/lib/auth/session";
import { getEmailCredentials } from "./store";
import { sendEmail } from "./smtp";
import { listInbox, getMessage, type InboxItem, type FullMessage } from "./imap";
import { buildReplySubject, buildReferences, escapeHtml } from "./imap-helpers";

const NO_CREDS = "No SMTP credentials. Configure them in Integrations first.";

export async function fetchInbox(): Promise<{
  ok: boolean;
  messages?: InboxItem[];
  error?: string;
}> {
  await requireAdmin();
  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, error: NO_CREDS };
  try {
    return { ok: true, messages: await listInbox(creds) };
  } catch (e) {
    return { ok: false, error: `IMAP error: ${(e as Error).message}` };
  }
}

export async function openMessage(uid: number): Promise<{
  ok: boolean;
  message?: FullMessage;
  error?: string;
}> {
  await requireAdmin();
  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, error: NO_CREDS };
  try {
    return { ok: true, message: await getMessage(creds, uid) };
  } catch (e) {
    return { ok: false, error: `IMAP error: ${(e as Error).message}` };
  }
}

export async function sendReply(
  uid: number,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const text = body.trim();
  if (!text) return { ok: false, error: "Reply is empty." };
  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, error: NO_CREDS };
  try {
    const original = await getMessage(creds, uid);
    if (!original.from) return { ok: false, error: "Original sender unknown." };
    const res = await sendEmail(creds, {
      to: original.from,
      subject: buildReplySubject(original.subject),
      text,
      html: `<p style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;color:#2d2d2d">${escapeHtml(text)}</p>`,
      inReplyTo: original.messageId || undefined,
      references: buildReferences(original.references, original.messageId) || undefined,
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  } catch (e) {
    return { ok: false, error: `Send failed: ${(e as Error).message}` };
  }
}
