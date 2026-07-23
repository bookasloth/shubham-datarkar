"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supportProjects, type SupportProject } from "@/lib/data/support-content";

/**
 * "Projects I'm working on" — 4×2 grid of square logo tiles. Tapping a tile
 * opens a minimal glass modal (top logo → blurb → visit link), centered.
 */
/** First two initials for a logo fallback tile. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function ProjectsGrid() {
  const [active, setActive] = React.useState<SupportProject | null>(null);
  // Some project PNGs aren't uploaded yet — swap a broken logo for an initials
  // tile instead of a broken-image icon.
  const [broken, setBroken] = React.useState<Set<string>>(new Set());
  const markBroken = (key: string) => setBroken((prev) => new Set(prev).add(key));

  // Deep-link: a project page's "Support this" button lands here with ?p={key},
  // so the matching project opens straight away. Read from window (not
  // useSearchParams) to avoid a Suspense boundary that would force this ISR
  // section dynamic.
  React.useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("p");
    if (!key) return;
    const match = supportProjects.find((p) => p.key === key);
    // One-time sync from the URL param on mount — feature, not a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setActive(match);
  }, []);

  return (
    <div>
      <p className="text-center text-sm font-semibold">Projects I&apos;m working on</p>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {supportProjects.map((proj) => (
          <button
            key={proj.key}
            type="button"
            onClick={() => setActive(proj)}
            aria-label={proj.name}
            className="flex aspect-square items-center justify-center rounded-btn border border-border bg-muted/40 p-2 transition-ui hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {broken.has(proj.key) ? (
              <span className="text-sm font-bold text-muted-foreground">{initials(proj.name)}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proj.logo} alt="" className="size-full object-contain" onError={() => markBroken(proj.key)} />
            )}
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-xs border-white/20 bg-card/60 text-center shadow-xl backdrop-blur-xl">
          {active && (
            <div className="flex flex-col items-center gap-3">
              <span className="flex size-20 items-center justify-center p-1">
                {broken.has(active.key) ? (
                  <span className="text-2xl font-bold text-muted-foreground">{initials(active.name)}</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.logo} alt="" className="size-full object-contain" onError={() => markBroken(active.key)} />
                )}
              </span>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription className="text-center">{active.blurb}</DialogDescription>
              <Link
                href={active.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-ui hover:opacity-70"
              >
                Visit
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
