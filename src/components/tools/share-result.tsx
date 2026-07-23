"use client";

import * as React from "react";
import { Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Share a tool RESULT as an image. Builds the /tools/share card, then uses the
 * native share sheet with the PNG file where supported (mobile), falling back to
 * a download. Every share is a branded impression + a link back to the tools.
 */
export function ShareResult({ tool, score, label }: { tool: string; score: number; label: string }) {
  const [busy, setBusy] = React.useState(false);
  const url = `/tools/share?tool=${encodeURIComponent(tool)}&score=${score}&label=${encodeURIComponent(label)}`;

  async function onShare() {
    setBusy(true);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "result.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: `${label}: ${score}/100`,
          text: "Checked mine free at shubhamdatarkar.com/tools",
        });
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `${label.toLowerCase().replace(/\s+/g, "-")}-${score}.png`;
        a.click();
        URL.revokeObjectURL(href);
      }
    } catch {
      // user cancelled the share sheet, or fetch failed — nothing to do
    } finally {
      setBusy(false);
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && "canShare" in navigator;
  return (
    <Button variant="outline" size="sm" onClick={onShare} loading={busy}>
      {canNativeShare ? <Share2 className="size-4" /> : <Download className="size-4" />}
      Share result
    </Button>
  );
}
