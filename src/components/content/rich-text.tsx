"use client";

import * as React from "react";
import Link from "next/link";
import type { InlineNode, RichText as RichTextValue } from "@/lib/data/types";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function InlineSpan({ node }: { node: InlineNode }) {
  if (typeof node === "string") return <>{node}</>;

  switch (node.t) {
    case "b":
      return <strong className="font-semibold text-foreground">{node.text}</strong>;
    case "i":
      return <em>{node.text}</em>;
    case "u":
      return <span className="underline decoration-foreground/40 underline-offset-4">{node.text}</span>;
    case "s":
      return <s className="text-muted-foreground">{node.text}</s>;
    case "mark":
      return (
        <mark className="rounded-[3px] bg-foreground/12 px-1 py-0.5 text-foreground decoration-clone">
          {node.text}
        </mark>
      );
    case "small":
      return <small className="text-[0.85em] text-muted-foreground">{node.text}</small>;
    case "code":
      return (
        <code className="rounded-[5px] border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
          {node.text}
        </code>
      );
    case "kbd":
      return <Kbd>{node.text}</Kbd>;
    case "sub":
      return <sub className="text-[0.7em]">{node.text}</sub>;
    case "sup":
      return <sup className="text-[0.7em]">{node.text}</sup>;
    case "a": {
      const external = /^https?:\/\//.test(node.href);
      return (
        <Link
          href={node.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="font-medium text-foreground underline decoration-foreground/30 underline-offset-[3px] transition-ui hover:decoration-foreground"
        >
          {node.text}
        </Link>
      );
    }
    case "tooltip":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="cursor-help font-medium text-foreground underline decoration-dotted decoration-foreground/40 underline-offset-[3px]"
            >
              {node.text}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-center normal-case">{node.tip}</TooltipContent>
        </Tooltip>
      );
    case "popover":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer font-medium text-foreground underline decoration-dashed decoration-foreground/40 underline-offset-[3px]"
            >
              {node.text}
            </button>
          </PopoverTrigger>
          <PopoverContent className="text-sm leading-relaxed text-muted-foreground">
            {node.content}
          </PopoverContent>
        </Popover>
      );
    case "fn":
      return (
        <sup className="ml-0.5 text-[0.7em] font-semibold">
          <a
            id={`fnref-${node.n}`}
            href={`#fn-${node.n}`}
            className="rounded-sm px-0.5 text-foreground underline decoration-foreground/30 underline-offset-2"
            aria-label={`Footnote ${node.n}`}
          >
            [{node.n}]
          </a>
        </sup>
      );
    default:
      return null;
  }
}

/** Renders a RichText value (plain string or inline-span array). */
export function RichText({ value }: { value: RichTextValue }) {
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((node, i) => (
        <InlineSpan key={i} node={node} />
      ))}
    </>
  );
}
