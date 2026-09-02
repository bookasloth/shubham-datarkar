"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "@/lib/community/notification-actions";

/** Marks the viewer's notifications read once the page has painted — so this
 *  view still shows which were new, while the bell badge clears on its next poll.
 *  Best-effort; a failure just leaves them unread. */
export function MarkReadOnMount() {
  useEffect(() => {
    markAllNotificationsRead().catch(() => {});
  }, []);
  return null;
}
