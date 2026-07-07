"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Tool registry: DB row (member_tools.component) → client component.
 * Adding a tool = one DB row + one component file + one line here.
 * No routing changes.
 */
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "utm-builder": dynamic(() => import("./utm-builder")),
};

export function ToolRenderer({ componentKey }: { componentKey: string }) {
  const Tool = TOOL_COMPONENTS[componentKey];
  if (!Tool) {
    return (
      <p className="text-sm text-muted-foreground">
        This tool is registered but its component is not deployed yet.
      </p>
    );
  }
  return <Tool />;
}
