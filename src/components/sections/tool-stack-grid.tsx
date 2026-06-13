import { toolStack } from "@/lib/data/tools-stack";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/** The stack Shubham actually works in. */
export function ToolStackGrid({ className }: { className?: string }) {
  return (
    <Stagger
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {toolStack.map((t) => (
        <StaggerItem key={t.name} className="bg-card p-5">
          <div className="font-display text-base font-bold tracking-tight">{t.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t.note}</div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
