/**
 * SMTP email configuration — types + field metadata for the admin form.
 * Pure constants (no server-only deps).
 */

export type EmailCredentials = {
  host: string;
  port: string; // kept as string in storage; parsed to number when sending
  secure: string; // "true" | "false" — implicit TLS (465) vs STARTTLS (587)
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  /** Where contact-form notifications are sent. */
  toEmail: string;
};

export type EmailFieldKey = keyof EmailCredentials;

export const EMAIL_FIELDS: {
  key: EmailFieldKey;
  label: string;
  secret: boolean;
  help: string;
}[] = [
  { key: "host", label: "SMTP Host", secret: false, help: "e.g. smtp.zoho.in, smtp.gmail.com." },
  { key: "port", label: "Port", secret: false, help: "465 for SSL/TLS, 587 for STARTTLS." },
  { key: "user", label: "Username", secret: false, help: "Usually your full email address." },
  { key: "pass", label: "Password", secret: true, help: "SMTP password or app-specific password." },
  { key: "fromName", label: "From name", secret: false, help: "Display name on outgoing mail, e.g. Shubham Datarkar." },
  { key: "fromEmail", label: "From email", secret: false, help: "Sender address — must be allowed by your SMTP host." },
  { key: "toEmail", label: "Notify email", secret: false, help: "Where contact-form submissions are emailed to you." },
];
