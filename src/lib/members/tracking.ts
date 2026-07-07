import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/** Log a resource view + bump its counter. Never throws. */
export async function trackView(resourceId: string, userId?: string | null): Promise<void> {
  try {
    const db = supabaseAdmin();
    await Promise.all([
      db.from("resource_events").insert({
        resource_id: resourceId,
        user_id: userId ?? null,
        event: "view",
      }),
      db.rpc("bump_resource_counter", { rid: resourceId, kind: "view" }),
    ]);
  } catch (e) {
    console.warn("[members] trackView failed", e);
  }
}

/** Log a search query for the analytics dashboard. Never throws. */
export async function trackSearch(query: string, userId?: string | null): Promise<void> {
  const q = query.trim().slice(0, 200);
  if (!q) return;
  try {
    await supabaseAdmin()
      .from("resource_events")
      .insert({ event: "search", query: q, user_id: userId ?? null });
  } catch (e) {
    console.warn("[members] trackSearch failed", e);
  }
}
