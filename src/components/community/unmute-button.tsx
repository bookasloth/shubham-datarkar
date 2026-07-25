"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMute } from "@/lib/community/social-actions";
import { useToast } from "@/components/ui/toast";

/** Unmute, from the muted list. Refreshes on success — the row has to leave the
 *  list, and the feed behind it changes too. */
export function UnmuteButton({ username }: { username: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        start(async () => {
          const r = await toggleMute(username);
          if ("error" in r) {
            toast({
              title: "Couldn't unmute",
              description: r.error,
              variant: "danger",
            });
            return;
          }
          setDone(true);
          router.refresh();
        })
      }
      className="rounded-btn border border-border px-3 py-1.5 text-sm font-medium transition-ui hover:bg-accent disabled:opacity-60"
    >
      {done ? "Unmuted" : "Unmute"}
    </button>
  );
}
