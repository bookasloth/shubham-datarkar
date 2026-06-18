"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

/**
 * Fires a single `ai_referral` event when a visitor arrives from an AI answer
 * engine (ChatGPT, Perplexity, Gemini, Copilot, Claude). This is the only way
 * to see GEO/AEO traffic — AI surfaces are invisible in normal referrer reports
 * because most strip or proxy the referrer. Renders nothing.
 */
const AI_HOSTS: Record<string, string> = {
  "chat.openai.com": "ChatGPT",
  "chatgpt.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "www.perplexity.ai": "Perplexity",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "www.bing.com": "Bing Copilot",
  "claude.ai": "Claude",
};

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
