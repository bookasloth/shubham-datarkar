import * as React from "react";
import { Container, Section } from "@/components/layout/container";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { CrosshairGrid } from "@/components/blueprint";
import { cn } from "@/lib/utils";

const HERO_MASK = "[mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]";

/** Consistent page header used across every interior page. */
export function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
  align = "left",
  blueprint = false,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  align?: "left" | "center";
  /** Swap the flat CSS grid for the animated blueprint crosshair grid. */
  blueprint?: boolean;
  className?: string;
}) {
  return (
    <Section bleed className={cn("relative overflow-hidden border-b border-border", className)}>
      {blueprint ? (
        <CrosshairGrid className={cn("opacity-40", HERO_MASK)} />
      ) : (
        <div
          className={cn("bg-grid pointer-events-none absolute inset-0 opacity-40", HERO_MASK)}
          aria-hidden
        />
      )}
      <Container className="relative py-14 md:py-20">
        {crumbs && <Breadcrumb items={crumbs} className="mb-6" />}
        <div className={cn("flex flex-col gap-4", align === "center" && "items-center text-center")}>
          {eyebrow && (
            <Badge variant="outline" className="w-fit">
              {eyebrow}
            </Badge>
          )}
          <Reveal>
            <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
          </Reveal>
          {description && (
            <Reveal delay={0.05}>
              <p className={cn("max-w-2xl text-lg text-muted-foreground", align === "center" && "mx-auto")}>
                {description}
              </p>
            </Reveal>
          )}
          {actions && <div className="mt-2 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </Container>
    </Section>
  );
}
