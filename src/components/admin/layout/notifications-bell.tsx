"use client";

import { Bell } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type AdminNotification = { id: string; title: string };

/** Placeholder feed — no backing API yet (see spec §7). Returns an empty list
 *  so the bell renders its empty state; wire to a real source in a later PR. */
function useAdminNotifications(): AdminNotification[] {
  return [];
}

export function NotificationsBell() {
  const notifications = useAdminNotifications();
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-btn border border-transparent text-admin-text-muted transition-[color,border-color] duration-150 hover:border-admin-border-hover hover:text-admin-text [&_svg]:size-4"
      >
        <Bell aria-hidden />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-admin-accent" aria-hidden />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border-admin-border bg-admin-surface p-0 text-admin-text" data-admin>
        <div className="border-b border-admin-border px-3 py-2 text-sm font-medium">Notifications</div>
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-admin-text-muted">You're all caught up.</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-admin-border px-3 py-2 text-sm last:border-0">
                {n.title}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
