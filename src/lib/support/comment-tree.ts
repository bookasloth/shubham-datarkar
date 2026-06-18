/** Comment tree types + builder. Pure — no server deps, so vitest can run it. */

/** Public-safe comment shape — the email column is never included. */
export type SafeComment = {
  id: string;
  parentId: string | null;
  name: string;
  /** Tier key (e.g. "pillars") snapshotted at post time, or null. */
  tier: string | null;
  body: string;
  createdAt: string;
};

export type CommentNode = SafeComment & { replies: CommentNode[] };

/**
 * Build a nested tree from a flat, chronologically-sorted comment list. Roots
 * (no parent, or a parent not in the set) come first; each node's replies keep
 * input order (oldest first). Orphans — replies whose parent is missing — are
 * surfaced as roots so a comment is never silently dropped.
 */
export function buildCommentTree(rows: SafeComment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const r of rows) byId.set(r.id, { ...r, replies: [] });

  const roots: CommentNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Total comment count across the whole tree. */
export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countComments(node.replies), 0);
}
