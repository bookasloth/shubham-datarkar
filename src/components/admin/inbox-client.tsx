"use client";

import * as React from "react";
import { RefreshCw, Paperclip, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchInbox, openMessage, sendReply } from "@/lib/email/imap-actions";
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

  // Apply a fetch result to state. Only ever called from a .then callback or an
  // event handler — never synchronously inside an effect body.
  const applyList = React.useCallback(
    (res: Awaited<ReturnType<typeof fetchInbox>>) => {
      if (res.ok && res.messages) setList(res.messages);
      else setListErr(res.error ?? "Failed to load inbox.");
      setLoadingList(false);
    },
    [],
  );

  // Refresh handler (event context).
  const load = React.useCallback(() => {
    setLoadingList(true);
    setListErr(null);
    void fetchInbox().then(applyList);
  }, [applyList]);

  // Initial load. setState happens in the .then callback (async), so the effect
  // body itself never calls setState synchronously.
  React.useEffect(() => {
    let active = true;
    void fetchInbox().then((res) => {
      if (active) applyList(res);
    });
    return () => {
      active = false;
    };
  }, [applyList]);

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
            {!loadingList && <RefreshCw />}
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
                  {m.hasAttachments && (
                    <Paperclip className="ml-auto size-3.5 text-muted-foreground" />
                  )}
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
                {!sending && <Send />}
                Send reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
