import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

// The owner id never changes at runtime — resolve once per server process.
let cached: string | null | undefined;

/** The owner's profile id (community_posts.user_id target), or null if unresolved. */
export async function getOwnerProfileId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const { data, error } = await supabaseAdmin().rpc("community_owner_id");
  cached = error ? null : ((data as string | null) ?? null);
  if (!cached) console.warn("[auto] community_owner_id resolved null — check ADMIN_EMAIL / profiles row");
  return cached;
}
