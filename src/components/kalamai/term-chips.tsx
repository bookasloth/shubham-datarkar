"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RankedTerm } from "@/lib/kalamai/terms";

/** Scannable term chips; click to copy the term. */
export function TermChips({ terms }: { terms: RankedTerm[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(term: string) {
    try {
      await navigator.clipboard.writeText(term);
      setCopied(term);
      setTimeout(() => setCopied((c) => (c === term ? null : c)), 1200);
    } catch {
      // clipboard blocked — no-op
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {terms.map((t) => (
        <button
          key={t.term}
          type="button"
          onClick={() => copy(t.term)}
          title={`Use ${t.freq.min}–${t.freq.max}× · click to copy`}
          className={cn(
            "rounded-btn border border-border px-2.5 py-1 text-xs transition-ui hover:bg-muted",
            copied === t.term && "border-foreground bg-foreground text-background",
          )}
        >
          {t.term}
          <span className={cn("ml-1.5 tabular-nums", copied === t.term ? "opacity-70" : "text-muted-foreground")}>
            {t.freq.min}–{t.freq.max}
          </span>
        </button>
      ))}
    </div>
  );
}
