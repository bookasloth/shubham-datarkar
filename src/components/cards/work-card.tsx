import { ArrowUpRight } from "lucide-react";
import type { WorkItem } from "@/lib/data/portfolio";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** A single portfolio entry. Links out when the item has a live URL. */
export function WorkCard({ item }: { item: WorkItem }) {
  const inner = (
    <Card interactive={!!item.url} className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="muted">{item.tag}</Badge>
        {item.url && (
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{item.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
    </Card>
  );
  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block focus-visible:outline-none">
        {inner}
      </a>
    );
  }
  return inner;
}
