import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";

export type Announcement = {
  id: string;
  message: string;
  href: string | null;
};

export type MemberTool = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  component: string;
  sort: number;
};

/** Live tools for the members tools directory. Never throws. */
export async function listLiveTools(): Promise<MemberTool[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("member_tools")
      .select("id,slug,name,description,icon,component,sort")
      .eq("status", "live")
      .order("sort");
    if (error) throw error;
    return (data ?? []) as MemberTool[];
  } catch (e) {
    console.warn("[members] tools fetch failed", e);
    return [];
  }
}

export async function getToolBySlug(slug: string): Promise<MemberTool | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("member_tools")
      .select("id,slug,name,description,icon,component,sort")
      .eq("status", "live")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as MemberTool | null) ?? null;
  } catch (e) {
    console.warn("[members] tool fetch failed", e);
    return null;
  }
}

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
