"use server";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { unreadNotificationCount } from "./notifications-queries";

/** Unread count for the bell. Returns 0 when signed out or on any error — the
 *  bell simply shows no badge. */
export async function getUnreadCount(): Promise<number> {
  return unreadNotificationCount();
}

/** Mark every unread notification for the viewer as read (definer RPC scoped to
 *  auth.uid()). Called when the notifications page mounts. */
export async function markAllNotificationsRead(): Promise<void> {
  const sb = await supabaseAuthServer();
  await sb.rpc("community_notifications_mark_read");
}
