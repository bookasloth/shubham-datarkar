"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** watch?v= / youtu.be / /embed/ → privacy-friendly embed URL, or null. */
function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.searchParams.get("v")) id = u.searchParams.get("v") ?? "";
    else if (u.pathname.includes("/embed/")) id = u.pathname.split("/embed/")[1] ?? "";
    if (!id) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}

export function TrailerButton({
  url,
  title,
  label = "Watch Trailer",
  variant = "default",
  size = "default",
  className,
  iconOnly = false,
}: {
  url: string | null | undefined;
  title: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const embed = url ? toEmbed(url) : null;
  if (!embed) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={className}
        aria-label={iconOnly ? `Play ${title} trailer` : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Play className={iconOnly ? "fill-current" : "fill-current"} />
        {!iconOnly && label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{title} — Trailer</DialogTitle>
          <div className="aspect-video w-full bg-black">
            {open && (
              <iframe
                src={embed}
                title={`${title} trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
