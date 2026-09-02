import "server-only";
import { allow } from "@/lib/rate-limit";

/**
 * Per-user rate budgets for community writes. Keyed on the user id (every
 * community write is authenticated), not IP — IP is shared behind NAT/CGNAT and
 * would punish co-located members, while a per-user key is exactly the actor a
 * flood comes from.
 *
 * Backed by the same `allow()` limiter the public API routes use (durable when
 * KV is configured, per-instance in-memory otherwise — it fails open, so a store
 * blip never blocks real writes). These ceilings are abuse brakes, set well
 * above any human's real cadence; a normal member never touches them.
 *
 * The action set is a literal type, so a caller passing an unbudgeted action is
 * a compile error rather than a runtime `undefined.max` throw.
 */
const HOUR = 3_600_000;
const DAY = 86_400_000;

const BUDGETS = {
  post: { max: 15, windowMs: HOUR },
  reply: { max: 40, windowMs: HOUR },
  quote: { max: 20, windowMs: HOUR },
  vote: { max: 300, windowMs: HOUR },
  bookmark: { max: 300, windowMs: HOUR },
  reblog: { max: 60, windowMs: HOUR },
  poll_vote: { max: 60, windowMs: HOUR },
  report: { max: 10, windowMs: HOUR },
  delete: { max: 60, windowMs: HOUR },
  publish: { max: 20, windowMs: HOUR },
  follow: { max: 100, windowMs: DAY },
  mute: { max: 100, windowMs: DAY },
} as const satisfies Record<string, { max: number; windowMs: number }>;

export type LimitAction = keyof typeof BUDGETS;

/** True when this action is within budget for the user; false once the window's
 *  ceiling is hit → the caller should block with GATE.RATE. */
export async function withinCommunityLimit(userId: string, action: LimitAction): Promise<boolean> {
  const b = BUDGETS[action];
  return allow(`community:${action}:${userId}`, b.max, b.windowMs);
}
