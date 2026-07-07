"use server";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** Upsert the member's reading progress (0..1). Completed at 95%. */
export async function saveProgress(resourceId: string, progress: number): Promise<void> {
  const clamped = Math.min(1, Math.max(0, Number(progress) || 0));
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("resource_progress").upsert(
    {
      user_id: user.id,
      resource_id: resourceId,
      progress: clamped,
      completed: clamped >= 0.95,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,resource_id" },
  );
  if (error) console.warn("[members] saveProgress failed", error);
}
