"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { AI_HOSTS } from "@/lib/attribution";

/**
 * Fires a single `ai_referral` event when a visitor arrives from an AI answer
 * engine (ChatGPT, Perplexity, Gemini, Copilot, Claude). This is the only way
 * to see GEO/AEO traffic — AI surfaces are invisible in normal referrer reports
 * because most strip or proxy the referrer. Renders nothing.
 */
export function AiReferrer() {
  useEffect(() => {
    const ref = document.referrer;
    if (!ref) return;
    let host: string;
    try {
      host = new URL(ref).hostname;
    } catch {
      return;
    }
    const source = AI_HOSTS[host];
    if (source) {
      track("ai_referral", { source, landing: window.location.pathname });
    }
  }, []);

  return null;
}
