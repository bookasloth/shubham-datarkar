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

/** "Sd" as a periodic-table element tile — the Shubham Datarkar mark. */
function SdTile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("size-full", className)} role="img" aria-label="Shubham Datarkar">
      <rect x="3.5" y="3.5" width="93" height="93" rx="12" fill="#ffffff" stroke={ORANGE} strokeWidth="5.5" />
      {/* lightning bolt, top-centre */}
      <path d="M52 14 L43 36 L49 36 L46 51 L59 30 L52 30 Z" fill={ORANGE} />
      <text
        x="50"
        y="84"
        fontSize="54"
        fill={ORANGE}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-poppins), sans-serif", fontWeight: 400 }}
      >
        Sd
      </text>
    </svg>
  );
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
  if (project.key === "shubham-datarkar") return <SdTile className={className} />;
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
