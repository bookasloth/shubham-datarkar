import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { tierFor, type Tier } from "@/lib/support/tiers";
import { emailKey } from "./comment-auth-crypto";

/**
 * Resolve a verified commenter email to a supporter tier via the email-free
 * support_lifetime view. The raw email never leaves the server; only the hash
 * is queried. Fail-safe to null (no badge).
 */
export async function resolveTier(email: string): Promise<Tier | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_lifetime")
      .select("lifetime_amount")
      .eq("supporter_key", emailKey(email))
      .maybeSingle();
    if (error) throw error;
    const lifetime = Number((data as { lifetime_amount?: number } | null)?.lifetime_amount ?? 0);
    return lifetime > 0 ? tierFor(lifetime) : null;
  } catch (e) {
    console.warn("[comment-tier] resolveTier failed:", (e as Error).message);
    return null;
  }
}
