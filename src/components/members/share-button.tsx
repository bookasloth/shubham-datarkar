"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-btn border border-border px-2.5 py-1.5 text-xs transition-ui hover:bg-accent"
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
