"use server";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export type ToggleBookmarkResult = { bookmarked: boolean; error?: string };

export async function toggleBookmark(resourceId: string): Promise<ToggleBookmarkResult> {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { bookmarked: false, error: "Sign in to bookmark." };

  const { data: existing } = await supabase
    .from("resource_bookmarks")
    .select("resource_id")
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("resource_bookmarks")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", user.id);
    if (error) return { bookmarked: true, error: error.message };
  } else {
    const { error } = await supabase
      .from("resource_bookmarks")
      .insert({ user_id: user.id, resource_id: resourceId });
    if (error) return { bookmarked: false, error: error.message };
  }

  const bookmarked = !existing;
  try {
    const db = supabaseAdmin();
    await Promise.all([
      db.rpc("bump_resource_counter", {
        rid: resourceId,
        kind: bookmarked ? "bookmark" : "unbookmark",
      }),
      bookmarked
        ? db.from("resource_events").insert({
            resource_id: resourceId,
            user_id: user.id,
            event: "bookmark",
          })
        : Promise.resolve(),
    ]);
  } catch (e) {
    console.warn("[members] bookmark counter failed", e);
  }

  return { bookmarked };
}
