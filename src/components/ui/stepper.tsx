import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { label: string; description?: string };

/** Horizontal multi-step progress indicator. `current` is the active index. */
export function Stepper({ steps, current, className }: { steps: Step[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex w-full items-center", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === steps.length - 1;
        return (
          <li key={step.label} className={cn("flex items-center", !last && "flex-1")}>
            <div className="flex items-center gap-3">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-ui",
                  done && "border-foreground bg-foreground text-background",
                  active && "border-foreground text-foreground",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="hidden sm:block">
                <div className={cn("text-sm font-medium", !done && !active && "text-muted-foreground")}>{step.label}</div>
                {step.description && <div className="text-xs text-muted-foreground">{step.description}</div>}
              </div>
            </div>
            {!last && <div className={cn("mx-3 h-px flex-1", done ? "bg-foreground" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
