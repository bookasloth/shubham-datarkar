import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WorkflowMeta } from "@/lib/resources/types";

export function WorkflowView({ meta }: { meta: WorkflowMeta }) {
  const steps = meta.steps ?? [];
  if (!steps.length) return null;

  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-semibold">
            {i + 1}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <h3 className="text-sm font-semibold leading-7">{step.title}</h3>
            {step.body && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {step.promptSlug && (
                <Link
                  href={`/members/resources/${step.promptSlug}`}
                  className="inline-flex items-center gap-1 rounded-btn border border-border px-2 py-1 transition-ui hover:bg-accent"
                >
                  Open prompt <ArrowRight className="size-3" />
                </Link>
              )}
              {step.toolSlug && (
                <Link
                  href={`/members/tools/${step.toolSlug}`}
                  className="inline-flex items-center gap-1 rounded-btn border border-border px-2 py-1 transition-ui hover:bg-accent"
                >
                  Open tool <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
            {step.output && (
              <p className="mt-2 rounded-input bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Output:</span> {step.output}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
