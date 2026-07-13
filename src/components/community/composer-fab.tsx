"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Composer } from "./composer";

export function ComposerFab({
  name,
  username,
}: {
  name?: string | null;
  username?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compose post"
        className="fixed bottom-6 left-6 z-40 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-ui hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Pencil className="size-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Mobile: bottom sheet (full-width, anchored bottom, flat bottom corners).
            sm+: reverts to the default centered modal. */}
        <DialogContent
          className={cn(
            "max-h-[90dvh] overflow-y-auto p-0",
            "bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-card",
            "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card",
          )}
        >
          <DialogTitle className="sr-only">Compose post</DialogTitle>
          <Composer name={name} username={username} onPosted={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
