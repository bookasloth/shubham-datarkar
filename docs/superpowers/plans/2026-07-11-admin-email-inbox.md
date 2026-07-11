# Admin Email Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read + reply email inbox to the admin at `/admin/inbox`, reading `namaskar@shubhamdatarkar.com` over IMAP and replying via the existing SMTP send path — so the owner never logs into Hostinger webmail.

**Architecture:** Live-on-open IMAP (no DB, no cron). Pure helpers (host derivation, reply headers, HTML sanitize) are unit-tested; the IMAP/SMTP/UI layers are integration-verified manually. IMAP host is derived from the stored SMTP host; credentials reuse the existing Supabase Vault store. Attachments download through a `requireAdmin` route handler.

**Tech Stack:** Next.js 16 (App Router, server actions + route handlers), React 19, `imapflow` (IMAP), `mailparser` (MIME), `sanitize-html` (safe render), existing `nodemailer` SMTP, Vitest.

## Global Constraints

- **Next.js 16 is not stock** — per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing route handlers / dynamic-API code; APIs may differ from training data.
- **Branch:** already on `feat/admin-email-inbox`, based on `origin/main`. Never commit to `main`. PR + merge at the end.
- **Design:** monochrome, no emojis, follow the existing admin design system (reuse `PageHeader`, `Button`, `Badge`, admin color tokens like `text-admin-text-muted`).
- **`server-only` boundary:** `imap.ts` is `import "server-only"` and must NEVER be imported by a client component. Client components import only the `"use server"` actions in `imap-actions.ts`. Confirm the build passes by `npm run build`'s own exit code (a client→server-only import type-checks but breaks the build).
- **Auth:** every server action and the attachment route calls `requireAdmin()` from `@/lib/auth/session` first.
- **Creds:** read via existing `getEmailCredentials()` from `@/lib/email/store`; secrets never reach the client.
- **Test runner:** `npm run test` (`vitest run`). Tests co-located as `*.test.ts`, style `import { describe, it, expect } from "vitest"`.

---

## File Structure

- Create `src/lib/email/imap-helpers.ts` — pure helpers: `imapHostFromSmtp`, `buildReplySubject`, `buildReferences`, `escapeHtml`, `sanitizeEmailHtml`.
- Create `src/lib/email/imap-helpers.test.ts` — unit tests for the above.
- Create `src/lib/email/imap.ts` — `server-only` IMAP client: `listInbox`, `getMessage`, `getAttachment` + types.
- Modify `src/lib/email/smtp.ts` — add `inReplyTo` / `references` to `SendInput` and pass through.
- Create `src/lib/email/imap-actions.ts` — `"use server"` actions: `fetchInbox`, `openMessage`, `sendReply`.
- Create `src/app/admin/inbox/attachment/route.ts` — `GET` attachment download.
- Create `src/app/admin/inbox/page.tsx` — server page (force-dynamic).
- Create `src/components/admin/inbox-client.tsx` — client UI (list · reading · reply).
- Modify `src/components/admin/layout/nav-config.tsx` — add "Email Inbox" nav item.

---

## Task 1: Pure helpers (host derivation, reply headers, sanitize)

**Files:**
- Create: `src/lib/email/imap-helpers.ts`
- Test: `src/lib/email/imap-helpers.test.ts`

**Interfaces:**
- Consumes: `sanitize-html`.
- Produces:
  - `imapHostFromSmtp(host: string): string`
  - `buildReplySubject(subject: string): string`
  - `buildReferences(references: string | undefined, messageId: string | undefined): string`
  - `escapeHtml(s: string): string`
  - `sanitizeEmailHtml(html: string, allowRemoteImages?: boolean): string`

- [ ] **Step 1: Add the sanitize dependency**

Run:
```bash
npm install sanitize-html && npm install -D @types/sanitize-html
```
Expected: both added to `package.json`, no errors.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/email/imap-helpers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  imapHostFromSmtp,
  buildReplySubject,
  buildReferences,
  escapeHtml,
  sanitizeEmailHtml,
} from "./imap-helpers";

describe("imapHostFromSmtp", () => {
  it("swaps smtp. prefix for imap.", () => {
    expect(imapHostFromSmtp("smtp.hostinger.com")).toBe("imap.hostinger.com");
    expect(imapHostFromSmtp("smtp.gmail.com")).toBe("imap.gmail.com");
  });
  it("passes through hosts without the smtp. prefix", () => {
    expect(imapHostFromSmtp("mail.example.com")).toBe("mail.example.com");
  });
});

describe("buildReplySubject", () => {
  it("prefixes Re: when absent", () => {
    expect(buildReplySubject("Hello")).toBe("Re: Hello");
  });
  it("does not double-prefix (any case)", () => {
    expect(buildReplySubject("Re: Hello")).toBe("Re: Hello");
    expect(buildReplySubject("RE: Hello")).toBe("RE: Hello");
  });
  it("handles empty subject", () => {
    expect(buildReplySubject("")).toBe("Re: ");
  });
});

describe("buildReferences", () => {
  it("chains existing references then the message id", () => {
    expect(buildReferences("<a@x>", "<b@x>")).toBe("<a@x> <b@x>");
  });
  it("drops missing parts", () => {
    expect(buildReferences(undefined, "<b@x>")).toBe("<b@x>");
    expect(buildReferences("<a@x>", undefined)).toBe("<a@x>");
    expect(buildReferences(undefined, undefined)).toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes the dangerous five", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");
  });
});

describe("sanitizeEmailHtml", () => {
  it("strips script tags and event handlers", () => {
    const out = sanitizeEmailHtml(`<p onclick="x()">hi</p><script>alert(1)</script>`);
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).toContain("hi");
  });
  it("blocks remote images by default, keeps the original url in data-blocked-src", () => {
    const out = sanitizeEmailHtml(`<img src="https://track.er/pixel.gif">`);
    expect(out).toContain('data-blocked-src="https://track.er/pixel.gif"');
    expect(out).not.toMatch(/src="https:\/\/track\.er/);
  });
  it("allows remote images when explicitly opted in", () => {
    const out = sanitizeEmailHtml(`<img src="https://ok.com/a.png">`, true);
    expect(out).toContain('src="https://ok.com/a.png"');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- imap-helpers`
Expected: FAIL — `Cannot find module './imap-helpers'`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/email/imap-helpers.ts`:
```ts
import sanitizeHtml from "sanitize-html";

/** Derive the IMAP host from the stored SMTP host (smtp.x -> imap.x). */
export function imapHostFromSmtp(host: string): string {
  return host.startsWith("smtp.") ? "imap." + host.slice("smtp.".length) : host;
}

/** "Re:" prefix without doubling it. */
export function buildReplySubject(subject: string): string {
  const s = (subject ?? "").trim();
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

/** RFC 5322 References header: prior References followed by the parent Message-ID. */
export function buildReferences(
  references: string | undefined,
  messageId: string | undefined,
): string {
  return [references?.trim(), messageId?.trim()].filter(Boolean).join(" ");
}

/** Escape the five HTML-significant characters for plain-text reply bodies. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REMOTE_IMG = /^https?:\/\//i;

/**
 * Sanitize an email HTML body for safe render. Strips scripts, event handlers,
 * iframes, etc. (anything not in the allow-list). Remote images are blocked by
 * default (open-tracking defense) — their url is stashed in data-blocked-src so
 * the UI can offer a "load images" toggle.
 */
export function sanitizeEmailHtml(html: string, allowRemoteImages = false): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "align"],
      img: ["src", "alt", "width", "height", "style"],
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
      img: (tagName, attribs) => {
        if (!allowRemoteImages && attribs.src && REMOTE_IMG.test(attribs.src)) {
          const { src, ...rest } = attribs;
          return { tagName, attribs: { ...rest, "data-blocked-src": src } };
        }
        return { tagName, attribs };
      },
    },
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- imap-helpers`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/imap-helpers.ts src/lib/email/imap-helpers.test.ts package.json package-lock.json
git commit -m "feat(inbox): pure email helpers — imap host, reply headers, html sanitize"
```

---

## Task 2: IMAP client (`imap.ts`)

**Files:**
- Create: `src/lib/email/imap.ts`

**Interfaces:**
- Consumes: `EmailCredentials` from `./config`; `imapHostFromSmtp`, `sanitizeEmailHtml` from `./imap-helpers`; `imapflow`, `mailparser`.
- Produces:
  - types `InboxItem`, `Attachment`, `FullMessage`
  - `listInbox(creds: EmailCredentials, limit?: number): Promise<InboxItem[]>`
  - `getMessage(creds: EmailCredentials, uid: number): Promise<FullMessage>` (marks `\Seen`)
  - `getAttachment(creds: EmailCredentials, uid: number, index: number): Promise<{ filename: string; contentType: string; content: Buffer }>`

- [ ] **Step 1: Add IMAP + MIME dependencies**

Run:
```bash
npm install imapflow mailparser && npm install -D @types/mailparser
```
Expected: added, no errors. (`imapflow` ships its own types.)

- [ ] **Step 2: Read the Next.js server-runtime note**

These run only in server actions/route handlers (Node runtime). No Next API here, but confirm nothing forces Edge. Skim `node_modules/next/dist/docs/` only if a build error later mentions runtime. No code this step.

- [ ] **Step 3: Write the implementation** (integration module — no unit test; verified by build + Task 6 manual run)

Create `src/lib/email/imap.ts`:
```ts
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
      const total = c.mailbox.exists;
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
      const toText =
        parsed.to && !Array.isArray(parsed.to) ? parsed.to.text : "";
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `imap.ts`. (If `mailparser` types complain about `parsed.to` union, the `!Array.isArray` narrowing above handles it; adjust only if tsc points at a real mismatch.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/imap.ts package.json package-lock.json
git commit -m "feat(inbox): IMAP client — list, read (mark seen), fetch attachment"
```

---

## Task 3: SMTP threading + server actions

**Files:**
- Modify: `src/lib/email/smtp.ts`
- Create: `src/lib/email/imap-actions.ts`

**Interfaces:**
- Consumes: `sendEmail` (extended) from `./smtp`; `getEmailCredentials` from `./store`; `requireAdmin` from `@/lib/auth/session`; `listInbox`, `getMessage`, `InboxItem`, `FullMessage` from `./imap`; `buildReplySubject`, `buildReferences`, `escapeHtml` from `./imap-helpers`.
- Produces:
  - `fetchInbox(): Promise<{ ok: boolean; messages?: InboxItem[]; error?: string }>`
  - `openMessage(uid: number): Promise<{ ok: boolean; message?: FullMessage; error?: string }>`
  - `sendReply(uid: number, body: string): Promise<{ ok: boolean; error?: string }>`

- [ ] **Step 1: Extend `SendInput` with threading headers**

In `src/lib/email/smtp.ts`, change the `SendInput` type and the `sendMail` call.

Type — add two optional fields:
```ts
export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
};
```

`sendMail` call — pass them through:
```ts
    await transport(creds).sendMail({
      from: fromHeader(creds),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      inReplyTo: input.inReplyTo,
      references: input.references,
    });
```

- [ ] **Step 2: Write the actions**

Create `src/lib/email/imap-actions.ts`:
```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/smtp.ts src/lib/email/imap-actions.ts
git commit -m "feat(inbox): SMTP threading headers + inbox server actions"
```

---

## Task 4: Attachment download route

**Files:**
- Create: `src/app/admin/inbox/attachment/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`; `getEmailCredentials`; `getAttachment` from `@/lib/email/imap`.
- Produces: `GET` handler at `/admin/inbox/attachment?uid=<n>&index=<n>`.

- [ ] **Step 1: Read the Next 16 route-handler doc**

Skim `node_modules/next/dist/docs/` for the route-handler / `GET` signature (Next 16 may differ from older App Router). Confirm `GET(request: Request)` returning a `Response` is current.

- [ ] **Step 2: Write the route**

Create `src/app/admin/inbox/attachment/route.ts`:
```ts
import { requireAdmin } from "@/lib/auth/session";
import { getEmailCredentials } from "@/lib/email/store";
import { getAttachment } from "@/lib/email/imap";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  await requireAdmin(); // redirects/throws if not admin

  const url = new URL(request.url);
  const uid = Number(url.searchParams.get("uid"));
  const index = Number(url.searchParams.get("index"));
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(index) || index < 0) {
    return new Response("Bad request", { status: 400 });
  }

  const creds = await getEmailCredentials();
  if (!creds) return new Response("Email not configured", { status: 503 });

  try {
    const att = await getAttachment(creds, uid, index);
    const safeName = att.filename.replace(/[\r\n"]/g, "");
    return new Response(new Uint8Array(att.content), {
      headers: {
        "Content-Type": att.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return new Response(`Error: ${(e as Error).message}`, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/inbox/attachment/route.ts
git commit -m "feat(inbox): admin-only attachment download route"
```

---

## Task 5: Inbox UI (page + client)

**Files:**
- Create: `src/app/admin/inbox/page.tsx`
- Create: `src/components/admin/inbox-client.tsx`

**Interfaces:**
- Consumes: `getEmailCredentials`; `PageHeader` from `@/components/admin`; `Button` from `@/components/ui/button`; actions `fetchInbox`, `openMessage`, `sendReply` and types `InboxItem`, `FullMessage`.
- Produces: the `/admin/inbox` page.

- [ ] **Step 1: Write the server page**

Create `src/app/admin/inbox/page.tsx`:
```tsx
import { getEmailCredentials } from "@/lib/email/store";
import { PageHeader } from "@/components/admin";
import { InboxClient } from "@/components/admin/inbox-client";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const creds = await getEmailCredentials();

  return (
    <div>
      <PageHeader title="Email Inbox" />
      {creds ? (
        <div className="mt-4">
          <InboxClient />
        </div>
      ) : (
        <p className="mt-4 text-sm text-admin-text-muted">
          No SMTP credentials yet. Configure them in{" "}
          <a href="/admin/integrations" className="underline">
            Integrations
          </a>{" "}
          first.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the client component**

Create `src/components/admin/inbox-client.tsx`:
```tsx
"use client";

import * as React from "react";
import { RefreshCw, Paperclip, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchInbox,
  openMessage,
  sendReply,
} from "@/lib/email/imap-actions";
import type { InboxItem, FullMessage } from "@/lib/email/imap";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export function InboxClient() {
  const [list, setList] = React.useState<InboxItem[]>([]);
  const [listErr, setListErr] = React.useState<string | null>(null);
  const [loadingList, setLoadingList] = React.useState(true);

  const [open, setOpen] = React.useState<FullMessage | null>(null);
  const [openErr, setOpenErr] = React.useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = React.useState(false);
  const [activeUid, setActiveUid] = React.useState<number | null>(null);

  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendMsg, setSendMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [showImages, setShowImages] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoadingList(true);
    setListErr(null);
    const res = await fetchInbox();
    if (res.ok && res.messages) setList(res.messages);
    else setListErr(res.error ?? "Failed to load inbox.");
    setLoadingList(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function select(uid: number) {
    setActiveUid(uid);
    setOpen(null);
    setOpenErr(null);
    setReply("");
    setSendMsg(null);
    setShowImages(false);
    setLoadingMsg(true);
    const res = await openMessage(uid);
    if (res.ok && res.message) {
      setOpen(res.message);
      // Reflect the just-read state in the list.
      setList((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
    } else {
      setOpenErr(res.error ?? "Failed to open message.");
    }
    setLoadingMsg(false);
  }

  async function submitReply() {
    if (!open || !reply.trim()) return;
    setSending(true);
    setSendMsg(null);
    const res = await sendReply(open.uid, reply);
    if (res.ok) {
      setSendMsg({ ok: true, text: "Reply sent." });
      setReply("");
    } else {
      setSendMsg({ ok: false, text: res.error ?? "Send failed." });
    }
    setSending(false);
  }

  // Reveal blocked remote images by rewriting data-blocked-src back to src.
  const bodyHtml = React.useMemo(() => {
    if (!open) return "";
    if (!showImages) return open.html;
    return open.html.replace(/data-blocked-src=/g, "src=");
  }, [open, showImages]);

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* List pane */}
      <div className="rounded-card border border-border">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium">Inbox</span>
          <Button variant="outline" size="sm" onClick={() => void load()} loading={loadingList}>
            {!loadingList && <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>
        {listErr && <p className="p-3 text-sm text-danger">{listErr}</p>}
        {loadingList && !list.length && (
          <p className="p-3 text-sm text-muted-foreground">Loading…</p>
        )}
        {!loadingList && !listErr && !list.length && (
          <p className="p-3 text-sm text-muted-foreground">No messages.</p>
        )}
        <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
          {list.map((m) => (
            <li key={m.uid}>
              <button
                type="button"
                onClick={() => void select(m.uid)}
                className={`flex w-full flex-col gap-0.5 p-3 text-left hover:bg-muted ${
                  activeUid === m.uid ? "bg-muted" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  {!m.seen && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  <span className={`truncate text-sm ${m.seen ? "" : "font-semibold"}`}>
                    {m.fromName || m.from || "(unknown)"}
                  </span>
                  {m.hasAttachments && <Paperclip className="ml-auto size-3.5 text-muted-foreground" />}
                </span>
                <span className="truncate text-sm text-muted-foreground">{m.subject}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(m.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Reading pane */}
      <div className="rounded-card border border-border p-4">
        {!activeUid && <p className="text-sm text-muted-foreground">Select a message.</p>}
        {loadingMsg && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading message…
          </p>
        )}
        {openErr && <p className="text-sm text-danger">{openErr}</p>}
        {open && !loadingMsg && (
          <div className="grid gap-4">
            <div className="grid gap-1 border-b border-border pb-3">
              <h2 className="text-base font-semibold">{open.subject}</h2>
              <p className="text-sm text-muted-foreground">
                From: {open.fromName ? `${open.fromName} <${open.from}>` : open.from}
              </p>
              <p className="text-xs text-muted-foreground">{fmtDate(open.date)}</p>
            </div>

            {open.html.includes("data-blocked-src") && !showImages && (
              <button
                type="button"
                onClick={() => setShowImages(true)}
                className="w-fit rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                Remote images blocked — load images
              </button>
            )}

            <div
              className="prose prose-sm max-w-none break-words text-sm"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {open.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {open.attachments.map((a) => (
                  <a
                    key={a.index}
                    href={`/admin/inbox/attachment?uid=${open.uid}&index=${a.index}`}
                    className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <Paperclip className="size-3.5" />
                    {a.filename}
                  </a>
                ))}
              </div>
            )}

            {/* Reply */}
            <div className="grid gap-2 border-t border-border pt-4">
              <label htmlFor="reply" className="text-sm font-medium">
                Reply to {open.from}
              </label>
              <textarea
                id="reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                placeholder="Write your reply…"
                className="w-full rounded-card border border-border bg-background p-2 text-sm"
              />
              {sendMsg && (
                <p className={`text-sm ${sendMsg.ok ? "text-success" : "text-danger"}`}>
                  {sendMsg.text}
                </p>
              )}
              <Button
                onClick={() => void submitReply()}
                loading={sending}
                disabled={!reply.trim()}
                className="w-fit"
              >
                {!sending && <Send className="size-4" />}
                Send reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If `Button` has no `size`/`loading` prop, check `src/components/ui/button.tsx` and adjust the props to match (the email form uses `loading`; `size="sm"` is used in the codebase per `email-verify-gate.tsx`).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/inbox/page.tsx src/components/admin/inbox-client.tsx
git commit -m "feat(inbox): admin inbox UI — list, read, attachments, reply"
```

---

## Task 6: Nav item + full build + manual verification + PR

**Files:**
- Modify: `src/components/admin/layout/nav-config.tsx`

- [ ] **Step 1: Add the nav item**

In `src/components/admin/layout/nav-config.tsx`, add `Inbox` to the lucide import line, and add this item to the **Audience** group (after Contacts):
```tsx
      { label: "Email Inbox", href: "/admin/inbox", icon: Inbox },
```
So the Audience group's `items` becomes:
```tsx
    items: [
      { label: "People", href: "/admin/people", icon: Contact },
      { label: "Subscribers", href: "/admin/subscribers", icon: Users },
      { label: "Contacts", href: "/admin/contacts", icon: Mail },
      { label: "Email Inbox", href: "/admin/inbox", icon: Inbox },
    ],
```

- [ ] **Step 2: Lint + unit tests + full build**

Run:
```bash
npm run lint && npm run test && npm run build
```
Expected: lint clean, `imap-helpers` tests pass, **build exits 0**. The build is the real gate — it catches any accidental client→`server-only` import. If the build fails, fix before proceeding (do not rely on `tsc` alone).

- [ ] **Step 3: Manual live verification** (dev server, logged in as admin)

Start the dev server (via the preview tool / `npm run dev`), sign into `/admin`, open **Email Inbox**. Confirm:
  1. Inbox list loads (latest messages, newest first).
  2. Unread messages show the dot + bold; opening one clears it (mark `\Seen`).
  3. A message with an attachment shows the clip; clicking the chip downloads the real file.
  4. Remote-image email shows the "load images" prompt; clicking reveals them.
  5. Send a reply to a test address → arrives, threaded under the original (In-Reply-To/References set).
  6. With SMTP misconfigured (wrong password), the list pane shows a clear IMAP error, not a crash.

Capture a screenshot of the working inbox for the PR.

- [ ] **Step 4: Commit + push + PR**

```bash
git add src/components/admin/layout/nav-config.tsx
git commit -m "feat(inbox): add Email Inbox to admin nav"
git push -u origin feat/admin-email-inbox
gh pr create --base main --title "feat(admin): Email Inbox — read + reply over IMAP" --body "Adds /admin/inbox: live IMAP read + reply via existing SMTP, downloadable attachments, sanitized HTML with remote images blocked by default. New deps: imapflow, mailparser, sanitize-html. No DB, no migration. Design spec: docs/superpowers/specs/2026-07-11-admin-email-inbox-design.md"
```

Do NOT deploy — production deploy is a separate manual gate (owner runs Vercel).

---

## Self-Review

**Spec coverage:**
- Route `/admin/inbox` → Task 5. ✔
- `imap.ts` list/getMessage/getAttachment + host derivation → Tasks 1, 2. ✔
- SMTP threading reuse → Task 3. ✔
- Actions requireAdmin → Task 3. ✔
- Attachment download route (requireAdmin) → Task 4. ✔
- UI panes + empty/error states → Task 5. ✔
- Nav "Email Inbox" in Audience → Task 6. ✔
- Security: sanitize, remote-image block, TLS, admin-only → Tasks 1 (sanitize), 2 (TLS), 3/4 (admin). ✔
- New deps imapflow/mailparser/sanitize-html → Tasks 1, 2. ✔
- Non-goals excluded (no compose/folders/delete/search/badge). ✔
- Testing: pure-helper units + manual live checklist → Tasks 1, 6. ✔
- Vercel fit: per-call connect/close in `finally` → Task 2. ✔

**Note on spec refinement:** the spec said attachment identifier "partId"; the plan uses the mailparser **attachment array index** instead — simpler and avoids IMAP part-number bookkeeping, since `getMessage`/`getAttachment` already parse the full source. Same user-visible behavior.

**Placeholder scan:** no TBD/TODO; every code step has full code. ✔

**Type consistency:** `InboxItem`/`FullMessage`/`Attachment` defined in Task 2, consumed unchanged in Tasks 3 & 5; `sendReply(uid, body)`, `openMessage(uid)`, `fetchInbox()` signatures match between Task 3 (definition) and Task 5 (calls); attachment route param `index` matches `Attachment.index` and the UI href. ✔
