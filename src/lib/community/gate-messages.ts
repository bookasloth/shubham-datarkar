/**
 * What the engage gate says when it turns someone away.
 *
 * Shared because the client compares against these to decide what to DO, not
 * just what to print: SIGNED_OUT opens the join modal instead of rendering as
 * text. If the copy lived only in the server action, rewording it there would
 * silently stop the modal from ever opening — a dead feature, no error, nothing
 * to notice. One source, so the two cannot drift.
 */
export const GATE = {
  SIGNED_OUT: "Sign in first.",
  UNVERIFIED: "Verify your email first.",
  RATE: "You're doing that too fast. Give it a minute.",
} as const;
