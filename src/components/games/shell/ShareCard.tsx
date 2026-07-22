"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Share2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildShareText,
  gameLeaderboardUrl,
  gameShareUrl,
  type ShareInput,
} from "@/lib/games/share";
import { renderResultImage } from "@/lib/games/resultImage";

/** lucide dropped its brand marks, so WhatsApp/Facebook/LinkedIn/Instagram ride as inline paths. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.848 3.37-1.848 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

const iconCls =
  "flex h-11 items-center justify-center rounded-btn border border-border bg-card text-foreground transition-ui hover:border-foreground/30";

/**
 * Expands under the Share button: a preview of the shareable image, then the
 * targets. WhatsApp/LinkedIn/Facebook carry text or a URL; Instagram and the
 * Download button carry the rendered PNG (Instagram has no web text-share).
 */
export function ShareCard({ share }: { share: ShareInput }) {
  const text = buildShareText(share);
  const url = gameShareUrl(share.game);
  const enc = encodeURIComponent(text);
  const community = `/community?compose=${enc}&returnTo=${encodeURIComponent(gameLeaderboardUrl(share.game))}`;

  const [copied, setCopied] = useState(false);
  // The PNG is rendered on demand — only when an image button is pressed — and
  // cached, so it never costs anything (or screen space) unless someone shares.
  const cache = useRef<{ url: string; blob: Blob } | null>(null);
  useEffect(() => () => {
    if (cache.current) URL.revokeObjectURL(cache.current.url);
  }, []);

  async function getImage() {
    if (cache.current) return cache.current;
    const blob = await renderResultImage(share);
    cache.current = { url: URL.createObjectURL(blob), blob };
    return cache.current;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard is permission-gated; the text is on screen to copy by hand.
    }
  }

  async function download() {
    const { url } = await getImage();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${share.game}-${share.puzzleNumber}.png`;
    a.click();
  }

  // Instagram/LinkedIn have no web file-share URL: on a phone hand the PNG to
  // the native share sheet; on desktop fall back to a download.
  async function shareImage() {
    const { blob } = await getImage();
    const file = new File([blob], `${share.game}-${share.puzzleNumber}.png`, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch {
        // user dismissed the sheet — nothing to do
      }
    }
    download();
  }

  return (
    <div className="w-full space-y-3 rounded-card border border-border bg-card p-3 text-left">
      {/* Row 1: copy (square) + community (3× wide) */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy result"
          className={cn(iconCls, "w-11 shrink-0", copied && "border-brand text-brand")}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
        <a
          href={community}
          aria-label="Share to SD Community"
          className={cn(iconCls, "flex-1 gap-2 px-4 text-sm font-semibold")}
        >
          <Users className="size-4" /> Share to Community
        </a>
      </div>

      {/* Row 2: four equal social squares */}
      <div className="grid grid-cols-4 gap-2">
        <a href={`https://wa.me/?text=${enc}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className={iconCls}>
          <WhatsAppIcon className="size-4" />
        </a>
        <button type="button" onClick={shareImage} aria-label="Share to LinkedIn" className={iconCls}>
          <LinkedInIcon className="size-4" />
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className={iconCls}
        >
          <FacebookIcon className="size-4" />
        </a>
        <button type="button" onClick={shareImage} aria-label="Share to Instagram" className={iconCls}>
          <InstagramIcon className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={download}
        className={cn(iconCls, "w-full gap-2 text-sm font-medium")}
      >
        <Download className="size-4" /> Download image
      </button>
    </div>
  );
}

/** Share button + the card it expands underneath. Used by every board and the end card. */
export function ShareBlock({ share }: { share: ShareInput }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-ui hover:opacity-90"
      >
        <Share2 className="size-4" /> Share
      </button>
      {open && <ShareCard share={share} />}
    </div>
  );
}
