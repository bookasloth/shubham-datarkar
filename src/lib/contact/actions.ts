"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactInput = {
  name: string;
  email: string;
  projectType?: string;
  budget?: string;
  message: string;
};

export type ContactResult = { ok: boolean; error?: string };

/** Escape user-supplied text before embedding in notification HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Public contact submission. Persists to the contacts table (service-role),
 * then emails a notification to the configured inbox + an auto-reply to the
 * sender. Email is fail-safe — a failure is logged but the submission still
 * succeeds (it's recorded in the dashboard either way). No-ops email until SMTP
 * is configured.
 */
export async function submitContact(input: ContactInput): Promise<ContactResult> {
  const name = String(input.name ?? "").trim().slice(0, 120);
  const email = String(input.email ?? "").trim().toLowerCase();
  const projectType = input.projectType ? String(input.projectType).trim().slice(0, 60) : null;
  const budget = input.budget ? String(input.budget).trim().slice(0, 60) : null;
  const message = String(input.message ?? "").trim().slice(0, 5000);

  if (!name) return { ok: false, error: "Your name helps." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email." };
  if (message.length < 10) return { ok: false, error: "A sentence or two, please." };

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("contacts")
    .insert({ name, email, project_type: projectType, budget, message })
    .select("id")
    .single();

  if (error) {
    console.warn("[contact] insert failed:", error.message);
    return { ok: false, error: "Couldn't send your message. Please try again." };
  }
  const id = String(data.id);

  try {
    const creds = await getEmailCredentials();
    if (creds) {
      const rows = [
        ["Name", name],
        ["Email", email],
        ["Project type", projectType ?? "—"],
        ["Budget", budget ?? "—"],
      ]
        .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${esc(String(v))}</td></tr>`)
        .join("");

      const notify = await sendEmail(creds, {
        to: creds.toEmail,
        replyTo: email,
        subject: `New contact: ${name}${projectType ? ` — ${projectType}` : ""}`,
        text: `New contact from ${name} <${email}>\nProject: ${projectType ?? "—"}\nBudget: ${budget ?? "—"}\n\n${message}`,
        html: `<h2 style="margin:0 0 12px">New contact submission</h2><table style="border-collapse:collapse">${rows}</table><p style="margin-top:16px;white-space:pre-wrap">${esc(message)}</p>`,
      });

      if (notify.ok) {
        await admin.from("contacts").update({ notified: true }).eq("id", id);
      } else {
        console.warn("[contact] notify email failed:", notify.error);
      }

      // Auto-reply to the sender.
      const reply = await sendEmail(creds, {
        to: email,
        subject: "Thanks — I got your message",
        text: `Hi ${name.split(" ")[0] || "there"},\n\nThanks for reaching out — I read every message and reply within one business day, usually sooner.\n\n— Shubham`,
        html: `<p>Hi ${esc(name.split(" ")[0] || "there")},</p><p>Thanks for reaching out — I read every message and reply within one business day, usually sooner.</p><p>— Shubham</p>`,
      });
      if (!reply.ok) console.warn("[contact] auto-reply failed:", reply.error);
    }
  } catch (e) {
    console.warn("[contact] email step threw:", (e as Error).message);
  }

  return { ok: true };
}
