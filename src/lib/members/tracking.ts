import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/** Log a resource view + bump its counter; stamp recently-viewed for members. Never throws. */
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
      // Recently-viewed: touch last_viewed_at without disturbing progress
      // (insert defaults progress to 0; update only overwrites the given cols).
      userId
        ? db.from("resource_progress").upsert(
            {
              user_id: userId,
              resource_id: resourceId,
              last_viewed_at: new Date().toISOString(),
            },
            { onConflict: "user_id,resource_id" },
          )
        : Promise.resolve(),
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
