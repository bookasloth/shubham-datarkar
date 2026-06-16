"use client";

import * as React from "react";
import { Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Share buttons for a blog post — open in a new tab; copy-link gives feedback. */
export function ShareBar({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const e = encodeURIComponent;

  const links = [
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      icon: <FacebookIcon />,
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(title)}`,
      icon: <XIcon />,
    },
    {
      label: "Share on Telegram",
      href: `https://t.me/share/url?url=${e(url)}&text=${e(title)}`,
      icon: <TelegramIcon />,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  const btn =
    "grid size-9 place-items-center rounded-full border border-border text-foreground transition-ui hover:-translate-y-px hover:bg-accent hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} className={btn}>
          {l.icon}
        </a>
      ))}
      <button type="button" onClick={copy} aria-label={copied ? "Link copied" : "Copy link"} className={btn}>
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
