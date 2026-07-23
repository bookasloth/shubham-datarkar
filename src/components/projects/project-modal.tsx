"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, ArrowUpRight } from "lucide-react";
import { BlueprintFrame } from "@/components/blueprint";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectPreview = {
  key: string;
  name: string;
  category: string;
  tagline: string;
  overview: string[];
};

/** Overlay preview for an intercepted project route. Closes via router.back(). */
export function ProjectModal({ project }: { project: ProjectPreview }) {
  const router = useRouter();
  const close = React.useCallback(() => router.back(), [router]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={project.name}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden />
      <BlueprintFrame
        variant="solid"
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-auto bg-card p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close preview"
          className="absolute right-3 top-3 rounded-btn p-1.5 text-muted-foreground transition-ui hover:bg-accent"
        >
          <X className="size-4" />
        </button>

        <Badge variant="muted">{project.category}</Badge>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">{project.name}</h2>
        <p className="mt-2 text-muted-foreground">{project.tagline}</p>
        {project.overview?.[0] && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{project.overview[0]}</p>
        )}

        <Link href={`/projects/${project.key}`} className={cn(buttonVariants(), "mt-6")}>
          Open full page
          <ArrowUpRight className="size-4" />
        </Link>
      </BlueprintFrame>
    </div>
  );
}
