import Link from "next/link";
import Image from "next/image";
import { Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResourceCard as ResourceCardData } from "@/lib/resources/types";
import { TypeIcon } from "./type-icons";

const TYPE_LABELS: Record<string, string> = {
  article: "Article",
  prompt: "Prompt",
  template: "Template",
  workflow: "Workflow",
  tool: "Tool",
  checklist: "Checklist",
  "case-study": "Case Study",
  download: "Download",
  video: "Video",
  snippet: "Snippet",
};

export function ResourceCard({
  resource,
  locked,
}: {
  resource: ResourceCardData;
  /** True when the current viewer's role can't open the content (metadata still shown). */
  locked: boolean;
}) {
  return (
    <Link
      href={`/members/resources/${resource.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-xs transition-ui hover:border-foreground/30"
    >
      {resource.cover_image ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border">
          <Image
            src={resource.cover_image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center border-b border-border bg-muted">
          <TypeIcon type={resource.type} className="size-7 text-muted-foreground/60" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-btn bg-accent px-1.5 py-0.5">
            <TypeIcon type={resource.type} className="size-3" />
            {TYPE_LABELS[resource.type] ?? resource.type}
          </span>
          {resource.category && <span>{resource.category.name}</span>}
          {locked && (
            <span className="ml-auto inline-flex items-center gap-1 text-foreground">
              <Lock className="size-3" />
              Member
            </span>
          )}
        </div>

        <h3 className="font-display text-sm font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
          {resource.title}
        </h3>

        {resource.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{resource.description}</p>
        )}

        <div
          className={cn(
            "mt-auto flex items-center gap-3 pt-1 text-[11px] text-muted-foreground",
            !resource.difficulty && !resource.reading_time && "hidden",
          )}
        >
          {resource.difficulty && <span className="capitalize">{resource.difficulty}</span>}
          {resource.reading_time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {resource.reading_time} min
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
