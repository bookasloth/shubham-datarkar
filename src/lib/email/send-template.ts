import "server-only";

import { getEmailCredentials } from "./store";
import { sendEmail, type SendInput } from "./smtp";
import type { RenderedEmail } from "./templates/_shared";

/**
 * Send a catalog template to one recipient. Fail-safe: no SMTP creds → silent
 * no-op (returns ok:false, never throws), matching every other sender. All
 * wiring code (webhooks, crons, actions) calls this so each send site is one
 * line and consistently branded.
 */
export async function sendTemplate(
  to: string,
  email: RenderedEmail,
  extra?: Partial<Pick<SendInput, "replyTo" | "inReplyTo" | "references">>,
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, error: "SMTP not configured" };
  return sendEmail(creds, {
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...extra,
  });
}
