import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_AFFILIATE_DOMAINS } from "./affiliate";

/**
 * Affiliate domains for the public render path + the admin page. Uses the
 * service-role client (server-only). Falls back to the defaults only on error
 * (e.g. table not created yet) — an intentionally-empty list is respected.
 */
export async function getAffiliateDomains(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("affiliate_domains")
      .select("domain")
      .order("domain", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => String(r.domain));
  } catch (e) {
    console.warn("[affiliate] getAffiliateDomains failed; using defaults:", (e as Error)?.message ?? e);
    return DEFAULT_AFFILIATE_DOMAINS;
  }
}
