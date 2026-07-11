# Admin Email Inbox — read + reply (live IMAP)

**Date:** 2026-07-11
**Status:** Approved design
**Route:** `/admin/inbox`

## Goal

Read and reply to `namaskar@shubhamdatarkar.com` from inside the site's admin, so
the owner never has to log into Hostinger webmail. Scope is **read + reply +
downloadable attachments** — not a full webmail.

## Context

The site already sends mail via SMTP:

- `src/lib/email/smtp.ts` — `nodemailer` transport, `sendEmail()`, `verifyEmail()`.
- `src/lib/email/store.ts` — `getEmailCredentials()` reads `EmailCredentials`
  (`host`, `port`, `secure`, `user`, `pass`, `fromName`, `fromEmail`, `toEmail`)
  from Supabase Vault (`get_email_secret` RPC), with env-var fallback.
- `src/lib/email/config.ts` — `EmailCredentials` type + admin form field metadata.
- Admin panel with a shared design system and nav in
  `src/components/admin/layout/nav-config.tsx`.

Credentials are already configured for Hostinger (`smtp.hostinger.com:465`, SSL).
This feature adds the **read** half (IMAP) and reuses the existing **send** half
for replies.

## Approach (decided)

- **Live-on-open IMAP.** Opening `/admin/inbox` connects to IMAP, pulls the
  latest messages, closes. No database table, no cron, no sync/dedup logic.
  Trade-off accepted: no nav unread-badge, ~1–2s load. Chosen over a
  DB-backed poll because a low-volume founder inbox does not justify the extra
  moving parts.
- **Reuse stored creds.** IMAP host is derived from the stored SMTP host
  (`smtp.` → `imap.`), port 993, TLS. No new credential field.

## Components

### 1. `src/lib/email/imap.ts` (server-only)

IMAP client built on `imapflow` + `mailparser`.

- `imapConfig(creds: EmailCredentials)` — derive `{ host, port: 993, secure: true,
  auth }`. Host derivation: `creds.host.replace(/^smtp\./, "imap.")`. If the host
  does not start with `smtp.`, use it as-is (a user on a non-standard host can
  still work if IMAP shares the SMTP hostname).
- `listInbox(creds, limit = 50)` → newest-first array of
  `{ uid, from, fromName, subject, date, seen, hasAttachments }`.
  Fetches envelope + flags + `bodyStructure` only — all metadata, no body
  content download (fast). `hasAttachments` is read from `bodyStructure`. No
  message preview/snippet in the list (subject + sender is enough for MVP).
- `getMessage(creds, uid)` → `{ uid, from, to, subject, date, html, text,
  attachments: { partId, filename, size, contentType }[], messageId,
  references }`. Parses MIME with `mailparser`. HTML is sanitized (see Security).
  Sets the `\Seen` flag on fetch.
- `getAttachment(creds, uid, partId)` → `{ filename, contentType, content: Buffer }`
  for streaming a single attachment.

Each function opens a connection, does its work in a `try`, and closes in
`finally` — serverless-safe. Connect/auth errors surface as thrown errors caught
by the actions layer.

### 2. `src/lib/email/smtp.ts` (extend)

Add optional threading headers to `SendInput`: `inReplyTo?: string`,
`references?: string`. Pass them through to `nodemailer.sendMail` as
`inReplyTo` / `references`. Existing callers unaffected (new fields optional).

### 3. `src/lib/email/imap-actions.ts` (`"use server"`)

All actions call `requireAdmin()` first and return `{ ok, error }`-shaped
results, matching the existing email actions.

- `fetchInbox()` → `{ ok, messages }` or `{ ok: false, error }`. Returns an
  empty/guidance state when `getEmailCredentials()` is null.
- `openMessage(uid)` → `{ ok, message }`.
- `sendReply(uid, body)` — fetch the original's `from` + `messageId` +
  `references`, then `sendEmail()` with To = original sender,
  subject = `Re: <original>` (no double `Re:`), `inReplyTo` + `references` set.

### 4. Attachment download route

`src/app/admin/inbox/attachment/route.ts` — `GET ?uid=&partId=`. Calls
`requireAdmin()`, then `getAttachment()`, streams the buffer with
`Content-Disposition: attachment; filename="…"` and the parsed content type. A
route handler (not a server action) so the browser downloads a real file.

### 5. UI

- `src/app/admin/inbox/page.tsx` — `force-dynamic` server component. Reads creds;
  if none, renders "Configure SMTP first" pointing at `/admin/integrations`.
  Otherwise renders the client inbox.
- Client components: list pane (left — sender, subject, date, unread dot,
  attachment clip) · reading pane (right — headers, sanitized body, attachment
  chips linking to the download route) · inline reply composer (textarea + Send).
- Follows the admin design system (reuse `PageHeader`, existing `Button`,
  `Badge`, etc.). Loading + error + empty states handled.

### 6. Nav

Add `{ label: "Email Inbox", href: "/admin/inbox", icon: Inbox }` (lucide
`Inbox`) to the **Audience** group in `nav-config.tsx`, next to Contacts.

## Data flow

1. Page load → `getEmailCredentials()`. Null → guidance state, stop.
2. Client → `fetchInbox()` → list pane.
3. Click message → `openMessage(uid)` (marks `\Seen`, sanitizes body) → reading
   pane.
4. Attachment chip → `GET /admin/inbox/attachment?uid=&partId=` → file download.
5. Reply → `sendReply(uid, body)` → SMTP send with threading headers → success
   toast; composer clears.

## Security

- Every action + the attachment route call `requireAdmin()`.
- Credentials come from Vault server-side; never sent to the client.
- **HTML sanitized** with `sanitize-html` — scripts/handlers/`<iframe>` stripped.
- **Remote images blocked by default** (rewrite `src` → placeholder; a "Load
  remote images" toggle re-renders unblocked). Prevents open-tracking pixels.
- IMAP over TLS (993).

## Error handling

- IMAP connect/auth failure → reading/list pane shows a clear error (e.g.
  "IMAP login failed — check the mailbox password in Integrations").
- Reply send failure → error toast, composer keeps the draft.
- Attachment route: bad/missing uid|partId → 400; not admin → 401/redirect.

## New dependencies

`imapflow`, `mailparser`, `sanitize-html` (+ `@types/mailparser`,
`@types/sanitize-html` if needed). IMAP protocol, MIME parsing, and safe HTML
render are not worth hand-rolling.

## Non-goals (YAGNI)

Compose-new, Sent/Drafts/folders, delete/archive, full-text search, nav
unread-badge, pagination beyond the latest 50, multi-mailbox. Each can be added
later without reworking this design.

## Testing

- **Unit (pure logic):** IMAP host derivation (`smtp.` → `imap.`, non-standard
  host passthrough) and reply-header construction (`Re:` de-duplication,
  `references` chaining). These are the non-trivial pure bits.
- **Manual (live):** in `/admin/inbox` — fetch list, open a message (confirms
  `\Seen`), download an attachment, send a reply and confirm it threads. Live
  IMAP/SMTP can't be unit-tested without a server.

## Vercel fit

Serverless-friendly: each action/route opens one IMAP connection, works, closes
in `finally`. Short connect timeout so a stalled host fails fast rather than
hanging the function.
