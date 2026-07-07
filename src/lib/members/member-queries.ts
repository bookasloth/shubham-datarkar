import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listResourcesByIds } from "@/lib/resources/queries";
import type { ResourceCard } from "@/lib/resources/types";

/*
 * Per-user rows (bookmarks/progress/requests) are read with the session client
 * so RLS self-policies apply. Resource cards are then hydrated via the service
 * role client because the resources table has no member read policy.
 */

export async function getBookmarkedResources(): Promise<ResourceCard[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("resource_bookmarks")
    .select("resource_id")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return listResourcesByIds(data.map((r) => r.resource_id));
}

export async function isBookmarked(resourceId: string): Promise<boolean> {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("resource_bookmarks")
    .select("resource_id")
    .eq("resource_id", resourceId)
    .maybeSingle();
  return !!data;
}

export type ProgressCard = ResourceCard & { progress: number };

/** Stored progress ratio for one resource (0 when never opened). */
export async function getMyProgress(resourceId: string): Promise<number> {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("resource_progress")
    .select("progress")
    .eq("resource_id", resourceId)
    .maybeSingle();
  return data ? Number(data.progress) : 0;
}

/** Started but unfinished reads, most recent first. */
export async function getContinueReading(limit = 6): Promise<ProgressCard[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("resource_progress")
    .select("resource_id,progress,completed,last_viewed_at")
    .eq("completed", false)
    .gt("progress", 0)
    .order("last_viewed_at", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];
  const progressById = new Map(data.map((r) => [r.resource_id, Number(r.progress)]));
  const cards = await listResourcesByIds(data.map((r) => r.resource_id));
  return cards.map((c) => ({ ...c, progress: progressById.get(c.id) ?? 0 }));
}

/** Everything the member has opened, most recent first. */
export async function getRecentlyViewed(limit = 6): Promise<ResourceCard[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("resource_progress")
    .select("resource_id")
    .order("last_viewed_at", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];
  return listResourcesByIds(data.map((r) => r.resource_id));
}

export type MemberRequest = {
  id: string;
  kind: string;
  title: string;
  details: string | null;
  status: string;
  created_at: string;
};

export async function getMyRequests(): Promise<MemberRequest[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("member_requests")
    .select("id,kind,title,details,status,created_at")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as MemberRequest[];
}

/** Distinct resources this user has downloaded (from the events log). */
export async function getMyDownloads(userId: string): Promise<ResourceCard[]> {
  const { data, error } = await supabaseAdmin()
    .from("resource_events")
    .select("resource_id,created_at")
    .eq("user_id", userId)
    .eq("event", "download")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data?.length) return [];
  const ids = [...new Set(data.map((r) => r.resource_id).filter(Boolean))] as string[];
  return listResourcesByIds(ids);
}
