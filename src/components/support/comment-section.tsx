"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { avatarUrl, avatarBg, formatDate } from "@/lib/utils";
import { initialsOf, TIERS } from "@/lib/support/config";
import { EmailVerifyGate } from "./email-verify-gate";
import { postComment, deleteComment } from "@/lib/support/comments-actions";
import { countComments, type CommentNode } from "@/lib/support/comment-tree";

/** Visual indent cap — threading is unbounded in data, but stops nesting here. */
const MAX_INDENT = 4;

function tierLabel(key: string | null): string | null {
  if (!key) return null;
  return TIERS.find((t) => t.key === key)?.label ?? null;
}

/**
 * Comments for a support update. Threading + identity gating live here; the
 * comment data is owned by the server component and refreshed via router.refresh()
 * after every mutation (no client-side cache to drift). Posting requires a
 * verified email — EmailVerifyGate sets the httpOnly cookie the action reads.
 */
export function CommentSection({
  code,
  comments,
  initialName,
  isAdmin,
}: {
  code: string;
  comments: CommentNode[];
  initialName: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [verifiedName, setVerifiedName] = React.useState<string | null>(initialName);
  const total = countComments(comments);

  return (
    <section id="comments" className="grid gap-5 scroll-mt-24">
      <h2 className="font-display text-lg font-bold tracking-tight">
        {total > 0 ? `${total} comment${total === 1 ? "" : "s"}` : "Comments"}
      </h2>

      {verifiedName ? (
        <CommentForm
          code={code}
          parentId={null}
          placeholder="Add a comment…"
          submitLabel="Comment"
          onPosted={() => router.refresh()}
        />
      ) : (
        <EmailVerifyGate onVerified={(v) => setVerifiedName(v.name)} />
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
      ) : (
        <ul className="grid gap-5">
          {comments.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              depth={0}
              code={code}
              canReply={!!verifiedName}
              isAdmin={isAdmin}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  node,
  depth,
  code,
  canReply,
  isAdmin,
  onChanged,
}: {
  node: CommentNode;
  depth: number;
  code: string;
  canReply: boolean;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [replying, setReplying] = React.useState(false);
  const indented = Math.min(depth, MAX_INDENT) > 0;
  const tier = tierLabel(node.tier);

  return (
    <li className={indented ? "border-l border-border pl-4" : ""}>
      <div className="flex items-start gap-3">
        <Avatar className="size-8 shrink-0 rounded-full" style={{ background: avatarBg(node.name) }}>
          <AvatarImage src={avatarUrl(node.name)} alt="" />
          <AvatarFallback className="rounded-full bg-foreground text-[10px] font-bold text-background">
            {initialsOf(node.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-tight">{node.name}</span>
            {tier && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {tier}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(node.createdAt)}</span>
          </div>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{node.body}</p>

          <div className="mt-2 flex items-center gap-4 text-xs">
            {canReply && (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {replying ? "Cancel" : "Reply"}
              </button>
            )}
            {isAdmin && <DeleteButton id={node.id} onDeleted={onChanged} />}
          </div>

          {replying && (
            <div className="mt-3">
              <CommentForm
                code={code}
                parentId={node.id}
                placeholder={`Reply to ${node.name}…`}
                submitLabel="Reply"
                autoFocus
                onPosted={() => {
                  setReplying(false);
                  onChanged();
                }}
              />
            </div>
          )}

          {node.replies.length > 0 && (
            <ul className="mt-4 grid gap-4">
              {node.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  node={reply}
                  depth={depth + 1}
                  code={code}
                  canReply={canReply}
                  isAdmin={isAdmin}
                  onChanged={onChanged}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function CommentForm({
  code,
  parentId,
  placeholder,
  submitLabel,
  autoFocus,
  onPosted,
}: {
  code: string;
  parentId: string | null;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onPosted: () => void;
}) {
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function submit() {
    if (pending || !body.trim()) return;
    setPending(true);
    setMsg(null);
    const res = await postComment(code, parentId, body);
    setPending(false);
    if (res.ok) {
      setBody("");
      onPosted();
    } else {
      setMsg(res.message);
    }
  }

  return (
    <div className="grid gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        className="rounded-input border border-border bg-background p-3 text-sm"
      />
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      <div>
        <Button type="button" size="sm" disabled={pending || !body.trim()} onClick={submit}>
          {pending ? "Posting…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [pending, setPending] = React.useState(false);

  async function del() {
    if (pending) return;
    setPending(true);
    const res = await deleteComment(id);
    setPending(false);
    if (res.ok) onDeleted();
  }

  return (
    <button
      type="button"
      onClick={del}
      disabled={pending}
      className="text-destructive transition-colors hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
