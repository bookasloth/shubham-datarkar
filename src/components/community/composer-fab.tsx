"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState("");
  const [seedTitle, setSeedTitle] = useState("");
  // Where to send the player after they post — the game's "Share to Community"
  // link carries ?returnTo=/games/<slug>/leaderboard.
  const [returnTo, setReturnTo] = useState<string | null>(null);

  // ?compose=<text> opens the composer pre-filled — the games' "Share to SD
  // Community" lands here. Read off `location` rather than useSearchParams(),
  // which would drag a Suspense boundary onto the whole feed page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get("compose");
    const rt = params.get("returnTo");
    // Same-origin paths only — never redirect off-site from a URL param.
    // Mount-only URL-param read — deriving initial state, not a render loop.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (rt && rt.startsWith("/") && !rt.startsWith("//")) setReturnTo(rt);
    if (!text) return;
    setSeed(text);
    setSeedTitle(params.get("composeTitle") ?? "");
    setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Drop the param so a refresh (or a back-nav) doesn't re-open the sheet.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  function afterPosted() {
    setOpen(false);
    if (returnTo) router.push(returnTo);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compose post"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-ui hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-6 sm:bottom-6"
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
          {/* key: remount when the seed arrives so useState picks the new initial body up */}
          <Composer key={seed} name={name} username={username} initialBody={seed} initialTitle={seedTitle} onPosted={afterPosted} />
        </DialogContent>
      </Dialog>
    </>
  );
}
