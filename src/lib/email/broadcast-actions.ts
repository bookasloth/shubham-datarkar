"use server";

import { requireAdmin } from "@/lib/auth/session";
import { getEmailCredentials } from "./store";
import { sendEmail } from "./smtp";
import { BROADCAST_TEMPLATES } from "./broadcasts";
import { getSubscribers } from "@/lib/subscribers/queries";
import { EMAIL_RE } from "@/lib/validation/email";

export type BroadcastState = { ok: boolean; message: string } | undefined;

/**
 * Send a campaign template as a test (one address) or to every active subscriber.
 * Admin-only. Fail-safe per recipient — one bad address doesn't abort the run.
 */
export async function sendBroadcast(
  _prev: BroadcastState,
  formData: FormData,
): Promise<BroadcastState> {
  await requireAdmin();

  const templateId = String(formData.get("templateId") ?? "");
  const mode = String(formData.get("mode") ?? "test"); // "test" | "list"
  const testEmail = String(formData.get("testEmail") ?? "").trim().toLowerCase();

  const tpl = BROADCAST_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return { ok: false, message: "Pick a template first." };

  const creds = await getEmailCredentials();
  if (!creds) return { ok: false, message: "SMTP isn't configured. Set it in Integrations first." };

  let recipients: string[];
  if (mode === "list") {
    // Require an explicit confirmation checkbox for the irreversible mass send.
    if (formData.get("confirm") !== "on") {
      return { ok: false, message: "Tick the confirm box to send to the whole list." };
    }
    const subs = await getSubscribers();
    recipients = subs.filter((s) => s.status === "active").map((s) => s.email);
    if (!recipients.length) return { ok: false, message: "No active subscribers to send to." };
  } else {
    if (!EMAIL_RE.test(testEmail)) return { ok: false, message: "Enter a valid test email address." };
    recipients = [testEmail];
  }

  // ponytail: serial send inside one request — fine for a founder list (hundreds).
  // At thousands this risks the Vercel function timeout + SMTP rate caps; move to a
  // queued/batched worker then. No dedup/retry here on purpose.
  let sent = 0;
  const failed: string[] = [];
  for (const to of recipients) {
    const res = await sendEmail(creds, {
      to,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    if (res.ok) sent++;
    else failed.push(to);
  }

  if (mode === "test") {
    return sent
      ? { ok: true, message: `Test of "${tpl.name}" sent to ${testEmail}.` }
      : { ok: false, message: `Test send failed: ${failed.length ? "SMTP error" : "unknown"}.` };
  }

  const base = `"${tpl.name}" sent to ${sent}/${recipients.length} active subscribers.`;
  return failed.length
    ? { ok: false, message: `${base} ${failed.length} failed.` }
    : { ok: true, message: base };
}
