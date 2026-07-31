"use client";

import { useState } from "react";

/** Copy the challenge's share link. Minimal — challenges share a link, not a grid. */
export function ChallengeShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      onClick={copy}
      className="rounded-btn border border-border bg-card px-4 py-2 text-sm font-medium transition-ui hover:bg-muted"
    >
      {copied ? "Link copied" : "Share challenge"}
    </button>
  );
}
