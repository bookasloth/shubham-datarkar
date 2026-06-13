import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import type { Tool } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/lib/icons";
import { compactNumber } from "@/lib/utils";

export function ToolCard({ tool }: { tool: Tool }) {
  const available = tool.status !== "Soon";
  const body = (
    <Card interactive={available} className="group relative flex h-full flex-col p-6">
      <div className="flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded-card bg-muted text-foreground">
          <Icon name={tool.icon} />
        </div>
        <Badge variant={tool.status === "Live" ? "success" : tool.status === "Beta" ? "warning" : "muted"}>
          {tool.status}
        </Badge>
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{tool.category}</span>
        {available ? (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Open tool
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Lock className="size-3.5" /> Soon
          </span>
        )}
      </div>
      {tool.uses ? (
        <p className="mt-1 text-xs text-muted-foreground">{compactNumber(tool.uses)} uses</p>
      ) : null}
    </Card>
  );

  if (!available) return body;
  return (
    <Link href={`/tools/${tool.slug}`} className="block focus-visible:outline-none">
      {body}
    </Link>
  );
}
