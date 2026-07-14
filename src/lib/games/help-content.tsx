import * as React from "react";
import { ALFAZY } from "@/lib/games/alfazy";
import { INTEGRA } from "@/lib/games/integra";
import { HIT_AND_BLOW } from "@/lib/games/hit-and-blow";
import type { GameKey } from "@/lib/games/registry";

/** Small tile used inside guide examples. `prefix` picks the game's tile CSS. */
export function ExampleTile({
  prefix,
  state,
  children,
}: {
  prefix: string;
  state: "correct" | "present" | "absent";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`${prefix}-tile ${prefix}-tile--${state} inline-flex h-8 w-8 items-center justify-center rounded-btn text-sm font-bold uppercase`}
    >
      {children}
    </span>
  );
}

function LegendRow({
  prefix,
  state,
  letter,
  label,
}: {
  prefix: string;
  state: "correct" | "present" | "absent";
  letter: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <ExampleTile prefix={prefix} state={state}>
        {letter}
      </ExampleTile>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export type Help = {
  /** One-line desc used as rail subheading. */
  desc: string;
  /** Full guide body shown as the rail's Guide card (example-led). */
  body: React.ReactNode;
};

export const HELP: Record<GameKey, Help> = {
  alfazy: {
    desc: `Guess the hidden ${ALFAZY.length}-letter word in ${ALFAZY.maxGuesses} tries.`,
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example</p>
          <div className="flex gap-1.5">
            <ExampleTile prefix="alfazy" state="correct">c</ExampleTile>
            <ExampleTile prefix="alfazy" state="absent">r</ExampleTile>
            <ExampleTile prefix="alfazy" state="present">a</ExampleTile>
            <ExampleTile prefix="alfazy" state="absent">n</ExampleTile>
            <ExampleTile prefix="alfazy" state="absent">e</ExampleTile>
          </div>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">C</span> is in the right spot.{" "}
            <span className="font-medium text-foreground">A</span> is in the word but the wrong spot.
            The rest aren&apos;t in the word.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Tile colours</p>
          <LegendRow prefix="alfazy" state="correct" letter="a" label="Right letter, right spot." />
          <LegendRow prefix="alfazy" state="present" letter="a" label="Right letter, wrong spot." />
          <LegendRow prefix="alfazy" state="absent" letter="a" label="Not in the word." />
        </div>

        <p className="text-muted-foreground">
          Every guess must be a real {ALFAZY.length}-letter word. You get {ALFAZY.maxGuesses} tries.
          A new word lands every day.
        </p>
      </div>
    ),
  },

  hit_and_blow: {
    desc: `Crack the ${HIT_AND_BLOW.length}-digit code in ${HIT_AND_BLOW.maxGuesses} tries.`,
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example</p>
          <p className="text-muted-foreground">
            Say the secret code is <code className="rounded bg-muted px-1 py-0.5 font-mono">1357</code>
            {" "}and you guess <code className="rounded bg-muted px-1 py-0.5 font-mono">1234</code>:
          </p>
          <div className="rounded-card border border-border bg-card px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg tracking-widest">1234</span>
              <span className="text-sm">
                <span title="Hit">🎯</span>
                <span title="Blow">💨</span>
                <span className="ml-2 text-muted-foreground">1 Hit · 1 Blow</span>
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            The <span className="font-medium text-foreground">1</span> is a{" "}
            <span className="font-medium text-foreground">Hit</span> — right digit, right spot. The{" "}
            <span className="font-medium text-foreground">3</span> is a{" "}
            <span className="font-medium text-foreground">Blow</span> — right digit, wrong spot. The
            2 and 4 aren&apos;t in the code.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Feedback per guess</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Hit</span> — right digit, right spot.
            </li>
            <li>
              <span className="font-medium text-foreground">Blow</span> — right digit, wrong spot.
            </li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Code rules</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>{HIT_AND_BLOW.length} digits, all different.</li>
            <li>Never starts with 0.</li>
            <li>You get {HIT_AND_BLOW.maxGuesses} tries.</li>
          </ul>
        </div>
      </div>
    ),
  },

  integra: {
    desc: `Guess the hidden equation in ${INTEGRA.maxGuesses} tries.`,
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example</p>
          <div className="flex flex-wrap gap-1.5">
            <ExampleTile prefix="integra" state="correct">1</ExampleTile>
            <ExampleTile prefix="integra" state="absent">0</ExampleTile>
            <ExampleTile prefix="integra" state="present">+</ExampleTile>
            <ExampleTile prefix="integra" state="absent">2</ExampleTile>
            <ExampleTile prefix="integra" state="correct">=</ExampleTile>
            <ExampleTile prefix="integra" state="absent">1</ExampleTile>
            <ExampleTile prefix="integra" state="absent">2</ExampleTile>
          </div>
          <p className="text-muted-foreground">
            The first <span className="font-medium text-foreground">1</span> and the{" "}
            <span className="font-medium text-foreground">=</span> are in the right spot. The{" "}
            <span className="font-medium text-foreground">+</span> belongs in the equation but in a
            different spot. The rest don&apos;t appear.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Tile colours</p>
          <LegendRow prefix="integra" state="correct" letter="=" label="Right symbol, right spot." />
          <LegendRow prefix="integra" state="present" letter="+" label="Right symbol, wrong spot." />
          <LegendRow prefix="integra" state="absent" letter="0" label="Not in the equation." />
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Equation rules</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Every guess is a valid equation with exactly one <code>=</code>.
            </li>
            <li>
              Only a number goes on the right of <code>=</code>.
            </li>
            <li>
              Normal order of operations: <code>×</code> and <code>÷</code> before <code>+</code>{" "}
              and <code>−</code>.
            </li>
            <li>It must compute correctly, with no leading zeros.</li>
            <li>You get {INTEGRA.maxGuesses} tries.</li>
          </ul>
        </div>
      </div>
    ),
  },
};
