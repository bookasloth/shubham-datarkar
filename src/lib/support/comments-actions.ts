"use server";

import { site } from "@/lib/site";
import { getEmailCredentials } from "@/lib/email/store";
import { sendEmail } from "@/lib/email/smtp";
import { renderEmail } from "@/lib/email/template";
import { requireAdmin } from "@/lib/auth/session";
import { getVerifiedCommenter } from "./comment-auth";
import { resolveTier } from "./comment-tier";
import { getCommentParent, insertComment, deleteCommentById } from "./comments";

export type CommentState = { ok: boolean; message: string };

const MAX_BODY = 2000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Post a comment as the currently-verified commenter (identity from the cookie). */
export async function postComment(
  code: string,
  parentId: string | null,
  bodyRaw: string,
): Promise<CommentState> {
  const me = await getVerifiedCommenter();
  if (!me) return { ok: false, message: "Verify your email to comment." };

  const body = String(bodyRaw ?? "").trim().slice(0, MAX_BODY);
  if (!body) return { ok: false, message: "Write something first." };

  // A reply must target a comment on this same update.
  let parent: { name: string; email: string } | null = null;
  if (parentId) {
    const p = await getCommentParent(parentId);
    if (!p || p.updateCode !== code) {
      return { ok: false, message: "That comment no longer exists." };
    }
    parent = { name: p.name, email: p.email };
  }

  const tier = await resolveTier(me.email);
  const id = await insertComment({
    updateCode: code,
    parentId,
    name: me.name,
    email: me.email,
    tier: tier?.key ?? null,
    body,
  });
  if (!id) return { ok: false, message: "Could not post your comment. Try again." };

  // Notifications are best-effort: never fail a posted comment over email trouble.
  try {
    await notify({ code, body, author: me.name, parent });
  } catch (e) {
    console.warn("[comments] notify failed:", (e as Error).message);
  }

  return { ok: true, message: "Posted." };
}

async function notify(opts: {
  code: string;
  body: string;
  author: string;
  parent: { name: string; email: string } | null;
}): Promise<void> {
  const creds = await getEmailCredentials();
  if (!creds) return;

  const url = `${site.url}/support/updates/${opts.code}#comments`;
  const safeBody = escapeHtml(opts.body);
  const safeAuthor = escapeHtml(opts.author);
  const owner = process.env.ADMIN_EMAIL || site.email;

  // Always tell the site owner about a new comment.
  await sendEmail(creds, {
    to: owner,
    subject: `New comment on your update #${opts.code}`,
    text: `${opts.author} commented: ${opts.body}\n\n${url}`,
    html: renderEmail({
      preheader: `New comment from ${opts.author}`,
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "New comment",
      bodyHtml: `<p style="margin:0 0 12px;font-size:14px;color:#2d2d2d;line-height:1.7"><strong>${safeAuthor}</strong> commented on update #${opts.code}:</p><p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">${safeBody}</p>`,
      cta: { label: "View comment", href: url },
    }),
  });

  // On a reply, also tell the parent author (unless it's the owner already notified).
  if (opts.parent?.email && opts.parent.email !== owner) {
    const safeParent = escapeHtml(opts.parent.name);
    await sendEmail(creds, {
      to: opts.parent.email,
      subject: `${opts.author} replied to your comment`,
      text: `${opts.author} replied: ${opts.body}\n\n${url}`,
      html: renderEmail({
        preheader: `${opts.author} replied to your comment`,
        headerTagline: "<strong>Shubham Datarkar</strong>",
        title: "You got a reply",
        bodyHtml: `<p style="margin:0 0 12px;font-size:14px;color:#2d2d2d;line-height:1.7">Hi ${safeParent}, <strong>${safeAuthor}</strong> replied to your comment:</p><p style="margin:0 0 18px;font-size:14px;color:#2d2d2d;line-height:1.7">${safeBody}</p>`,
        cta: { label: "View reply", href: url },
      }),
    });
  }
}

/** Admin: remove a comment and its replies (cascade). */
export async function deleteComment(id: string): Promise<CommentState> {
  await requireAdmin();
  const ok = await deleteCommentById(id);
  return ok ? { ok: true, message: "Deleted." } : { ok: false, message: "Delete failed." };
}
