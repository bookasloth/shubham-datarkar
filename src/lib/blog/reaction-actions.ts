"use server";

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { isReactionKey, type ReactionCounts, type ReactionKey } from "./reactions";

export type ReactResult = { ok: true; counts: ReactionCounts } | { ok: false };

/**
 * Apply a reaction to a post. `prev` is the user's previous pick (or null),
 * `next` is the new pick (or null to clear). The apply_reaction RPC does the
 * atomic −1 prev / +1 next and returns the full count map. Service-role only;
 * the browser never touches the table directly.
 */
export async function react(
  slug: string,
  next: ReactionKey | null,
  prev: ReactionKey | null,
): Promise<ReactResult> {
  if (!slug) return { ok: false };
  if (next !== null && !isReactionKey(next)) return { ok: false };
  if (prev !== null && !isReactionKey(prev)) return { ok: false };
  if (next === null && prev === null) return { ok: false };

  // Anonymous by design (dedup is client-side only), so cap the rate per IP to
  // keep the counts from being trivially inflated in a loop.
  if (!(await allow(`react:${clientIp(await headers())}`, 30, 60_000))) return { ok: false };

  const { data, error } = await supabaseAdmin().rpc("apply_reaction", {
    p_slug: slug,
    p_next: next,
    p_prev: prev,
  });

  if (error) return { ok: false };
  return { ok: true, counts: (data ?? {}) as ReactionCounts };
}
