import type { Project } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="muted">{project.category}</Badge>
        <span className="text-xs text-muted-foreground">{project.year}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{project.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{project.summary}</p>

      {project.metric && (
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight">{project.metric.value}</span>
          <span className="text-xs text-muted-foreground">{project.metric.label}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.stack.map((s) => (
          <span key={s} className="rounded-btn bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {s}
          </span>
        ))}
      </div>
    </Card>
  );
}
