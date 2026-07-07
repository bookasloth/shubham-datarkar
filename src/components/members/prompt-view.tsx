import { CopyButton } from "@/components/ui/copy-button";
import type { PromptMeta } from "@/lib/resources/types";

export function PromptView({ meta }: { meta: PromptMeta }) {
  const chips = [
    meta.model && { label: "Model", value: meta.model },
    meta.role && { label: "Role", value: meta.role },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-5">
      {(chips.length > 0 || meta.goal) && (
        <div className="space-y-3">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="rounded-btn bg-accent px-2 py-1 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">{c.label}:</span> {c.value}
                </span>
              ))}
            </div>
          )}
          {meta.goal && <p className="text-sm text-muted-foreground">{meta.goal}</p>}
        </div>
      )}

      {meta.promptBody && (
        <div className="rounded-card border border-border bg-muted/50">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Prompt</span>
            <CopyButton value={meta.promptBody} label="Copy prompt" />
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed">
            {meta.promptBody}
          </pre>
        </div>
      )}

      {meta.variables && meta.variables.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Variables</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {meta.variables.map((v) => (
              <code
                key={v}
                className="rounded-btn border border-border bg-background px-2 py-1 font-mono text-xs"
              >
                {`{{${v}}}`}
              </code>
            ))}
          </div>
        </div>
      )}

      {meta.exampleOutput && (
        <details className="rounded-card border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium transition-ui hover:bg-accent">
            Example output
          </summary>
          <div className="whitespace-pre-wrap border-t border-border px-4 py-3 text-sm text-muted-foreground">
            {meta.exampleOutput}
          </div>
        </details>
      )}
    </div>
  );
}
