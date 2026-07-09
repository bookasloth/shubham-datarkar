"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const triggerCls =
  "rounded-btn border border-border px-2 py-1 text-xs text-muted-foreground transition-ui hover:border-foreground hover:text-foreground";

function Swatch({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`integra-tile ${cls} inline-flex h-6 w-6 items-center justify-center rounded-btn text-xs font-bold`} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default function IntegraHelpModal() {
  return (
    <Dialog>
      <DialogTrigger className={triggerCls}>Help</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How to play</DialogTitle>
          <DialogDescription>Guess the hidden equation in six tries.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-foreground">After each guess, the tiles change colour:</p>
            <Swatch cls="integra-tile--correct" label="Right symbol, right spot." />
            <Swatch cls="integra-tile--present" label="Right symbol, wrong spot." />
            <Swatch cls="integra-tile--absent" label="Not in the equation." />
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
      </DialogContent>
    </Dialog>
  );
}
