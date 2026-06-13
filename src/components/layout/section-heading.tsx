import * as React from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: As = "h2",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-px w-6 bg-border" aria-hidden />
          {eyebrow}
        </span>
      )}
      <As className="text-3xl font-bold tracking-tight md:text-4xl">{title}</As>
      {description && (
        <p className={cn("max-w-2xl text-base text-muted-foreground md:text-lg", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
