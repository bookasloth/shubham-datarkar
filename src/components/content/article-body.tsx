import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { slugify } from "@/lib/utils";

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-[17px] leading-8 text-foreground/90">{block.text}</p>;
    case "h2":
      return (
        <h2 id={slugify(block.text)} className="scroll-mt-28 pt-4 text-2xl font-bold tracking-tight">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 id={slugify(block.text)} className="scroll-mt-28 text-xl font-semibold tracking-tight">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="ml-1 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[17px] leading-8 text-foreground/90">
              <span className="mt-3 size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="ml-1 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[17px] leading-8 text-foreground/90">
              <span className="mt-1 font-display text-sm font-bold text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-foreground pl-5">
          <p className="font-display text-xl font-medium leading-snug tracking-tight">{block.text}</p>
          {block.cite && <cite className="mt-2 block text-sm not-italic text-muted-foreground">— {block.cite}</cite>}
        </blockquote>
      );
    case "callout":
      return (
        <Alert variant={block.variant === "accent" ? "accent" : block.variant === "info" ? "info" : "default"}>
          <div>
            {block.title && <AlertTitle>{block.title}</AlertTitle>}
            <AlertDescription className={block.title ? "" : "mt-0 text-foreground"}>{block.text}</AlertDescription>
          </div>
        </Alert>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-card border border-border bg-muted/60 p-4 text-sm">
          <code className="font-mono text-foreground">{block.code}</code>
        </pre>
      );
    default:
      return null;
  }
}

export function ArticleBody({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
