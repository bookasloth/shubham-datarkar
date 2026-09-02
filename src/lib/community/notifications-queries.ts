import "server-only";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { NotifyVerb } from "./notify";

export type NotificationItem = {
  id: string;
  verb: NotifyVerb;
  createdAt: string;
  readAt: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  /** Present for post-linked verbs (everything but follow). */
  postPublicId: string | null;
  postSnippet: string | null;
};

/** The viewer's notifications, newest first. Enriched (actor + post snippet) by
 *  the definer RPC; RLS + the RPC both scope to auth.uid(). */
export async function listNotifications(limit = 30, offset = 0): Promise<NotificationItem[]> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_notifications_list", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.warn("community_notifications_list failed:", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    verb: r.verb as NotifyVerb,
    createdAt: r.created_at as string,
    readAt: (r.read_at as string) ?? null,
    actorUsername: (r.actor_username as string) ?? null,
    actorDisplayName: (r.actor_display_name as string) ?? null,
    actorAvatarUrl: (r.actor_avatar_url as string) ?? null,
    postPublicId: r.post_public_id != null ? String(r.post_public_id) : null,
    postSnippet: (r.post_snippet as string) ?? null,
  }));
}

/** Count of the viewer's unread notifications — the bell badge. */
export async function unreadNotificationCount(): Promise<number> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_notifications_unread");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}
