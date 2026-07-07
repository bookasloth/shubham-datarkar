"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/members/queries";

const KEY = "members-announcement-dismissed";

export function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  // Hidden until mount so SSR output matches the client (localStorage unknown).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(localStorage.getItem(KEY) !== announcement.id);
  }, [announcement.id]);

  if (!visible) return null;

  const body = announcement.href ? (
    <Link href={announcement.href} className="underline-offset-4 hover:underline">
      {announcement.message}
    </Link>
  ) : (
    announcement.message
  );

  return (
    <div className="flex items-center justify-center gap-3 border-b border-border bg-foreground px-4 py-2 text-center text-xs text-background">
      <span>{body}</span>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          localStorage.setItem(KEY, announcement.id);
          setVisible(false);
        }}
        className="rounded-btn p-0.5 opacity-70 transition-ui hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
