// Pure threading arithmetic, kept out of engage-actions (which pulls in
// server-only) so it unit-tests without a server context.

export const MAX_REPLY_DEPTH = 3;

/**
 * Given the depth of the post being replied to (root post = 0), the depth of
 * the ancestor to attach the new reply UNDER, so the reply lands at depth ≤
 * MAX_REPLY_DEPTH.
 *
 * Reply under the target itself while that stays in bounds; once the target is
 * at the max depth, attach to its parent instead, so the reply becomes a
 * same-level sibling rather than a fourth level.
 */
export function clampParentDepth(targetDepth: number): number {
  return Math.min(targetDepth, MAX_REPLY_DEPTH - 1);
}
