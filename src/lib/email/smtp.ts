import "server-only";

import nodemailer from "nodemailer";
import type { EmailCredentials } from "./config";

/**
 * SMTP transport built from the stored credentials. Used for the contact-form
 * notification + auto-reply, and the admin Test Connect.
 */

function transport(creds: EmailCredentials) {
  return nodemailer.createTransport({
    host: creds.host,
    port: Number(creds.port) || 587,
    secure: creds.secure !== "false", // true for 465, false for 587 (STARTTLS)
    auth: { user: creds.user, pass: creds.pass },
  });
}

function fromHeader(creds: EmailCredentials): string {
  return creds.fromName ? `"${creds.fromName}" <${creds.fromEmail}>` : creds.fromEmail;
}

export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail(
  creds: EmailCredentials,
  input: SendInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await transport(creds).sendMail({
      from: fromHeader(creds),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Verify the SMTP connection + auth without sending anything. */
export async function verifyEmail(
  creds: EmailCredentials,
): Promise<{ ok: boolean; message: string }> {
  try {
    await transport(creds).verify();
    return { ok: true, message: `Connected to ${creds.host}:${creds.port}.` };
  } catch (e) {
    return { ok: false, message: `SMTP connection failed: ${(e as Error).message}` };
  }
}
