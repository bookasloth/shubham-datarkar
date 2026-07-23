"use client";

import * as React from "react";
import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportProject } from "@/lib/data/support-content";

const ORANGE = "#FF4D00";

/** First two initials, for a last-resort logo fallback. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Bug icon in a bordered tile — the Marketing Bug mark. */
function BugTile({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex size-full items-center justify-center rounded-[12%] border-2 bg-white", className)}
      style={{ borderColor: ORANGE }}
    >
      <Bug className="size-2/5" style={{ color: ORANGE }} strokeWidth={2} />
    </span>
  );
}

/**
 * Renders a project's logo: the two projects whose PNGs aren't uploaded get a
 * designed in-code mark (Sd element tile, Bug icon); the rest load their CDN
 * logo with an initials tile as a last-resort fallback if it 404s.
 */
export function ProjectLogo({ project, className }: { project: SupportProject; className?: string }) {
  const [broken, setBroken] = React.useState(false);
  if (project.key === "marketing-bug") return <BugTile className={className} />;
  if (broken) {
    return (
      <span className={cn("flex size-full items-center justify-center", className)}>
        <span className="text-sm font-bold text-muted-foreground">{initials(project.name)}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={project.logo}
      alt=""
      className={cn("size-full object-contain", className)}
      onError={() => setBroken(true)}
    />
  );
}
