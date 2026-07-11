"use server";

import { headers } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail } from "@/lib/email/template";
import { toAttributionRow, type FirstTouch } from "@/lib/attribution";
import { EMAIL_RE } from "@/lib/validation/email";
import { allow, clientIp } from "@/lib/rate-limit";

export type ContactInput = {
  name: string;
  email: string;
  projectType?: string;
  budget?: string;
  message: string;
  attribution?: FirstTouch | null;
  /** Honeypot: must stay empty. A real user never sees this field. */
  company?: string;
};

/** Strip CR/LF so user text can't inject email headers (defense in depth; nodemailer also encodes). */
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ");
}

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
  // Honeypot: bots fill hidden fields. Silently succeed — no row, no email —
  // so the bot can't tell it was caught.
  if (input.company && input.company.trim() !== "") return { ok: true };

  // Throttle by IP: this action writes a row AND sends two emails (incl. an
  // auto-reply to the submitter-supplied address), so it's an email-amplification
  // + DB-flood vector without a cap. (M-2)
  if (!allow(`contact:${clientIp(await headers())}`, 3, 60_000)) {
    return { ok: false, error: "Too many messages. Please wait a minute." };
  }

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
    .insert({ name, email, project_type: projectType, budget, message, ...toAttributionRow(input.attribution) })
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
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-size:14px">${k}</td><td style="font-size:14px;color:#2d2d2d">${esc(String(v))}</td></tr>`,
        )
        .join("");

      const notify = await sendEmail(creds, {
        to: creds.toEmail,
        replyTo: email,
        subject: oneLine(`New contact: ${name}${projectType ? ` — ${projectType}` : ""}`),
        text: `New contact from ${name} <${email}>\nProject: ${projectType ?? "—"}\nBudget: ${budget ?? "—"}\n\n${message}`,
        html: renderEmail({
          preheader: `New contact from ${name}`,
          headerTagline: "<strong>Contact form</strong>",
          title: "New contact submission",
          bodyHtml: `<table role="presentation" style="border-collapse:collapse;margin:4px 0 18px">${rows}</table><p style="margin:0;font-size:14px;color:#2d2d2d;line-height:1.7;white-space:pre-wrap">${esc(message)}</p>`,
          cta: { label: "Reply", href: `mailto:${email}` },
          footerNote: "Sent to you because someone submitted the contact form on shubhamdatarkar.com.",
        }),
      });

      if (notify.ok) {
        await admin.from("contacts").update({ notified: true }).eq("id", id);
      } else {
        console.warn("[contact] notify email failed:", notify.error);
      }

      // Auto-reply to the sender.
      const firstName = name.split(" ")[0] || "there";
      const reply = await sendEmail(creds, {
        to: email,
        subject: "Thanks — I got your message",
        text: `Hi ${firstName},\n\nThanks for reaching out — I read every message and reply within one business day, usually sooner.\n\n— Shubham`,
        html: renderEmail({
          preheader: "Thanks for reaching out — I'll reply within a business day.",
          headerTagline: "<strong>Shubham Datarkar</strong>",
          title: `Thanks, ${esc(firstName)}`,
          bodyHtml: `<p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">Thanks for reaching out — I read every message and reply within one business day, usually sooner.</p><p style="margin:0;font-size:14px;color:#2d2d2d;line-height:1.7">— Shubham</p>`,
        }),
      });
      if (!reply.ok) console.warn("[contact] auto-reply failed:", reply.error);
    }
  } catch (e) {
    console.warn("[contact] email step threw:", (e as Error).message);
  }

  return { ok: true };
}
