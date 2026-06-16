"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supportProjects, type SupportProject } from "@/lib/data/support-content";

/**
 * "Projects I'm working on" — 4×2 grid of square logo tiles. Tapping a tile
 * opens a minimal glass modal (top logo → blurb → visit link), centered.
 */
export function ProjectsGrid() {
  const [active, setActive] = React.useState<SupportProject | null>(null);

  return (
    <div>
      <p className="text-center text-sm font-semibold">Projects I&apos;m working on</p>

      <div className="mt-3 grid grid-cols-8 gap-1.5">
        {supportProjects.map((proj) => (
          <button
            key={proj.key}
            type="button"
            onClick={() => setActive(proj)}
            aria-label={proj.name}
            className="aspect-square overflow-hidden rounded-[3px] border border-border bg-muted/40 transition-ui hover:-translate-y-px hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proj.logo} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-xs border-white/20 bg-card/60 text-center shadow-xl backdrop-blur-xl">
          {active && (
            <div className="flex flex-col items-center gap-3">
              <span className="flex size-16 items-center justify-center overflow-hidden rounded-[3px] border border-border bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.logo} alt="" className="size-full object-cover" />
              </span>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription className="text-center">{active.blurb}</DialogDescription>
              <a
                href={active.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-ui hover:opacity-70"
              >
                Visit
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
