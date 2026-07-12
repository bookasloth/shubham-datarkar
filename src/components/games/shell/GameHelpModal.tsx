"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALFAZY } from "@/lib/games/alfazy";
import { INTEGRA } from "@/lib/games/integra";
import { HIT_AND_BLOW } from "@/lib/games/hit-and-blow";
import type { GameKey } from "@/lib/games/registry";

/** A coloured example tile, using the same per-game CSS as the board. */
function Swatch({ prefix, state, label }: { prefix: string; state: "correct" | "present" | "absent"; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${prefix}-tile ${prefix}-tile--${state} inline-flex h-6 w-6 items-center justify-center rounded-btn text-xs font-bold`} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

type Help = { desc: string; body: React.ReactNode };

/** Per-game rules copy. One shell, three bodies — beats three near-identical modals. */
const HELP: Record<GameKey, Help> = {
  alfazy: {
    desc: `Guess the hidden ${ALFAZY.length}-letter word in ${ALFAZY.maxGuesses} tries.`,
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium text-foreground">After each guess, the tiles change colour:</p>
          <Swatch prefix="alfazy" state="correct" label="Right letter, right spot." />
          <Swatch prefix="alfazy" state="present" label="Right letter, wrong spot." />
          <Swatch prefix="alfazy" state="absent" label="Not in the word." />
        </div>
        <p className="text-muted-foreground">
          Every guess must be a real {ALFAZY.length}-letter word. A new word lands every day.
        </p>
      </div>
    ),
  },
  hit_and_blow: {
    desc: `Crack the ${HIT_AND_BLOW.length}-digit code in ${HIT_AND_BLOW.maxGuesses} tries.`,
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Each guess scores two ways:</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li><span className="font-medium text-foreground">Hit</span> — right digit, right spot.</li>
            <li><span className="font-medium text-foreground">Blow</span> — right digit, wrong spot.</li>
          </ul>
        </div>
        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Code rules</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>{HIT_AND_BLOW.length} digits, all different.</li>
            <li>Never starts with 0.</li>
          </ul>
        </div>
        <p className="text-muted-foreground">
          Example: guess <code>1234</code> against a code of <code>1357</code> gives 1 Hit (the 1) and 1 Blow (the 3).
        </p>
      </div>
    ),
  },
  integra: {
    desc: `Guess the hidden equation in ${INTEGRA.maxGuesses} tries.`,
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium text-foreground">After each guess, the tiles change colour:</p>
          <Swatch prefix="integra" state="correct" label="Right symbol, right spot." />
          <Swatch prefix="integra" state="present" label="Right symbol, wrong spot." />
          <Swatch prefix="integra" state="absent" label="Not in the equation." />
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Equation rules</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Every guess is a valid equation with exactly one <code>=</code>.</li>
            <li>Only a number goes on the right of <code>=</code>.</li>
            <li>Normal order of operations: <code>×</code> and <code>÷</code> before <code>+</code> and <code>−</code>.</li>
            <li>It must compute correctly, with no leading zeros.</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Example</p>
          <p className="text-muted-foreground">
            <code>12+3=15</code> works because 12 + 3 equals 15. With order of operations,{" "}
            <code>2+3×4=14</code> — the 3 × 4 happens first.
          </p>
        </div>
      </div>
    ),
  },
};

/**
 * Shared How-to-play modal for every game. Controlled so the welcome flow can
 * auto-open it on a player's first visit; the header "Help" pill also drives it.
 */
export function GameHelpModal({
  game,
  open,
  onOpenChange,
}: {
  game: GameKey;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const h = HELP[game];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-game={game} className="max-w-md">
        <DialogHeader>
          <DialogTitle>How to play</DialogTitle>
          <DialogDescription>{h.desc}</DialogDescription>
        </DialogHeader>
        {h.body}
      </DialogContent>
    </Dialog>
  );
}
