import * as React from "react";
import { ALFAZY } from "@/lib/games/alfazy";
import { INTEGRA } from "@/lib/games/integra";
import { HIT_AND_BLOW } from "@/lib/games/hit-and-blow";
import type { GameKey } from "@/lib/games/registry";

export function Swatch({
  prefix,
  state,
  label,
}: {
  prefix: string;
  state: "correct" | "present" | "absent";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`${prefix}-tile ${prefix}-tile--${state} inline-flex h-6 w-6 items-center justify-center rounded-btn text-xs font-bold`}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export type Help = {
  /** One-line desc used as modal + rail subheading. */
  desc: string;
  /** Full "how to play" body (modal). */
  body: React.ReactNode;
  /** Compact rail body — just the swatches / hit-blow legend. */
  tileGuide: React.ReactNode;
  /** Short intro shown in the rail's How to Play card. */
  intro: React.ReactNode;
};

export const HELP: Record<GameKey, Help> = {
  alfazy: {
    desc: `Guess the hidden ${ALFAZY.length}-letter word in ${ALFAZY.maxGuesses} tries.`,
    intro: (
      <p>
        Guess the hidden {ALFAZY.length}-letter word in {ALFAZY.maxGuesses} tries. After each
        guess, the colour of the tiles will change to show how close your guess was to the word.
      </p>
    ),
    tileGuide: (
      <div className="space-y-2">
        <Swatch prefix="alfazy" state="correct" label="Correct letter & position" />
        <Swatch prefix="alfazy" state="present" label="Correct letter, wrong position" />
        <Swatch prefix="alfazy" state="absent" label="Letter not in the word" />
      </div>
    ),
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
    intro: (
      <p>
        Crack the {HIT_AND_BLOW.length}-digit code in {HIT_AND_BLOW.maxGuesses} tries. Each guess
        returns hits (right digit + right spot) and blows (right digit, wrong spot).
      </p>
    ),
    tileGuide: (
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">Hit</span> — right digit, right spot.
        </li>
        <li>
          <span className="font-medium text-foreground">Blow</span> — right digit, wrong spot.
        </li>
        <li>{HIT_AND_BLOW.length} digits, all different, never starts with 0.</li>
      </ul>
    ),
    body: (
      <div className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Each guess scores two ways:</p>
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
          </ul>
        </div>
        <p className="text-muted-foreground">
          Example: guess <code>1234</code> against a code of <code>1357</code> gives 1 Hit (the 1)
          and 1 Blow (the 3).
        </p>
      </div>
    ),
  },
  integra: {
    desc: `Guess the hidden equation in ${INTEGRA.maxGuesses} tries.`,
    intro: (
      <p>
        Guess the hidden equation in {INTEGRA.maxGuesses} tries. Tile colours reveal which symbols
        are in the right or wrong spot.
      </p>
    ),
    tileGuide: (
      <div className="space-y-2">
        <Swatch prefix="integra" state="correct" label="Correct symbol & position" />
        <Swatch prefix="integra" state="present" label="Correct symbol, wrong position" />
        <Swatch prefix="integra" state="absent" label="Symbol not in the equation" />
      </div>
    ),
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
