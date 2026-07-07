import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";

export type Announcement = {
  id: string;
  message: string;
  href: string | null;
};

/** Latest active announcement inside its window, or null. Never throws. */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("announcements")
      .select("id,message,href")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.warn("[members] announcement fetch failed", e);
    return null;
  }
}
