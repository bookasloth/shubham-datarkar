import "server-only";

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { EmailCredentials } from "./config";
import { imapHostFromSmtp, sanitizeEmailHtml } from "./imap-helpers";

export type InboxItem = {
  uid: number;
  from: string;
  fromName: string;
  subject: string;
  date: string; // ISO
  seen: boolean;
  hasAttachments: boolean;
};

export type Attachment = {
  index: number;
  filename: string;
  size: number;
  contentType: string;
};

export type FullMessage = {
  uid: number;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  date: string;
  html: string; // sanitized; remote images blocked
  text: string;
  attachments: Attachment[];
  messageId: string;
  references: string;
};

function client(creds: EmailCredentials): ImapFlow {
  return new ImapFlow({
    host: imapHostFromSmtp(creds.host),
    port: 993,
    secure: true,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
    // Fail fast instead of hanging the serverless function.
    greetingTimeout: 8000,
    socketTimeout: 20000,
  });
}

// Walk the IMAP bodyStructure to detect an attachment disposition without
// downloading any body content.
function structHasAttachments(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { disposition?: string; childNodes?: unknown[] };
  if (String(n.disposition ?? "").toLowerCase() === "attachment") return true;
  return Array.isArray(n.childNodes) && n.childNodes.some(structHasAttachments);
}

export async function listInbox(
  creds: EmailCredentials,
  limit = 50,
): Promise<InboxItem[]> {
  const c = client(creds);
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      const mailbox = c.mailbox;
      const total = typeof mailbox === "object" ? mailbox.exists : 0;
      if (!total) return [];
      const start = Math.max(1, total - limit + 1);
      const items: InboxItem[] = [];
      for await (const msg of c.fetch(`${start}:*`, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      })) {
        const fromAddr = msg.envelope?.from?.[0];
        items.push({
          uid: msg.uid,
          from: fromAddr?.address ?? "",
          fromName: fromAddr?.name ?? "",
          subject: msg.envelope?.subject ?? "(no subject)",
          date: (msg.envelope?.date ?? new Date(0)).toISOString(),
          seen: msg.flags?.has("\\Seen") ?? false,
          hasAttachments: structHasAttachments(msg.bodyStructure),
        });
      }
      return items.sort((a, b) => b.date.localeCompare(a.date));
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => {});
  }
}

export async function getMessage(
  creds: EmailCredentials,
  uid: number,
): Promise<FullMessage> {
  const c = client(creds);
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      const msg = await c.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) throw new Error("Message not found.");
      // Mark read once opened (best-effort).
      await c.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true }).catch(() => {});
      const parsed = await simpleParser(msg.source);
      const fromAddr = parsed.from?.value?.[0];
      const toText = parsed.to && !Array.isArray(parsed.to) ? parsed.to.text : "";
      const refs = parsed.references;
      return {
        uid,
        from: fromAddr?.address ?? "",
        fromName: fromAddr?.name ?? "",
        to: toText,
        subject: parsed.subject ?? "(no subject)",
        date: (parsed.date ?? new Date(0)).toISOString(),
        html: sanitizeEmailHtml(parsed.html || parsed.textAsHtml || ""),
        text: parsed.text ?? "",
        attachments: (parsed.attachments ?? []).map((a, i) => ({
          index: i,
          filename: a.filename ?? `attachment-${i + 1}`,
          size: a.size ?? 0,
          contentType: a.contentType ?? "application/octet-stream",
        })),
        messageId: parsed.messageId ?? "",
        references: Array.isArray(refs) ? refs.join(" ") : refs ?? "",
      };
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => {});
  }
}

export async function getAttachment(
  creds: EmailCredentials,
  uid: number,
  index: number,
): Promise<{ filename: string; contentType: string; content: Buffer }> {
  const c = client(creds);
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      const msg = await c.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) throw new Error("Message not found.");
      const parsed = await simpleParser(msg.source);
      const att = (parsed.attachments ?? [])[index];
      if (!att) throw new Error("Attachment not found.");
      return {
        filename: att.filename ?? `attachment-${index + 1}`,
        contentType: att.contentType ?? "application/octet-stream",
        content: att.content as Buffer,
      };
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => {});
  }
}
