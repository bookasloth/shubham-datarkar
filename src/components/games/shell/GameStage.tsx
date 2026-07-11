import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The centered game column — the one stage every game plugs into.
 * Today it's the same centered stack all three games already used; it's
 * also the seam where wide-screen meta rails (rules / stats / streak) will
 * grow via container queries once GameMeta exists. Keeping it a component
 * means that change lands in one place for every game.
 */
export function GameStage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col items-center gap-4", className)}>{children}</div>;
}
