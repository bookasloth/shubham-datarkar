"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { isLiked, toggleLike } from "@/lib/photos/likes";
import { HeartConfetti } from "@/components/photos/heart-confetti";
import { cn } from "@/lib/utils";

/**
 * Anonymous like toggle for a single photo. Outline `Heart` by default; when
 * liked it fills and switches to `--brand` (a sanctioned interaction state) with
 * a brief heartbeat pulse. Liking fires a heart-confetti burst and a guarded
 * `navigator.vibrate`. State is read from and written to the localStorage
 * like-store, and re-synced on mount so it reflects the current photo.
 */
export function LikeButton({
  photoId,
  className,
  size = 22,
}: {
  photoId: string;
  className?: string;
  size?: number;
}) {
  const [liked, setLiked] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);
  // Monotonic key so each like remounts a fresh confetti burst.
  const [burst, setBurst] = React.useState<number | null>(null);

  // Sync from storage on mount and whenever the target photo changes (the
  // lightbox reuses one button instance as it navigates between photos).
  React.useEffect(() => {
    setLiked(isLiked(photoId));
    setPulse(false);
    setBurst(null);
  }, [photoId]);

  const onClick = React.useCallback(() => {
    const now = toggleLike(photoId);
    setLiked(now);
    if (now) {
      setPulse(true);
      setBurst(Date.now());
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(30);
        } catch {
          // vibrate can throw in some embedded contexts; ignore.
        }
      }
    } else {
      setPulse(false);
    }
  }, [photoId]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? "Unlike photo" : "Like photo"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-btn p-2 transition-ui",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        liked
          ? "text-brand"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <style>{likeCss}</style>
      <Heart
        size={size}
        strokeWidth={2}
        fill={liked ? "currentColor" : "none"}
        className={cn("like-heart", liked && pulse && "like-heart--pulse")}
        onAnimationEnd={() => setPulse(false)}
      />
      {burst !== null && liked && (
        <HeartConfetti key={burst} onDone={() => setBurst(null)} />
      )}
    </button>
  );
}

const likeCss = `
.like-heart { transition: transform var(--dur-fast, 150ms) var(--ease-out-quint, cubic-bezier(0.22,1,0.36,1)); }
.like-heart--pulse { animation: like-heartbeat 600ms var(--ease-out-quint, cubic-bezier(0.22,1,0.36,1)); }
@keyframes like-heartbeat {
  0% { transform: scale(1); }
  25% { transform: scale(1.35); }
  45% { transform: scale(0.92); }
  70% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .like-heart--pulse { animation: none; }
}
`;
