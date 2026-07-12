"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { triggerCls } from "@/components/games/modal-trigger";

/**
 * Shared settings modal. The colour-blind toggle only appears when the game has
 * colour tiles to disambiguate (Alfazy, Integra) — pass `onColorblindChange`.
 * Hit and Blow has no colour cue, so it shows the theme note alone.
 * ponytail: no per-game setting for H&B yet; add one here if a real knob appears.
 */
export function GameSettingsModal({
  game,
  colorblind,
  onColorblindChange,
}: {
  game: string;
  colorblind?: boolean;
  onColorblindChange?: (v: boolean) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger className={triggerCls}>Settings</DialogTrigger>
      <DialogContent data-game={game} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        {onColorblindChange && (
          <label className="flex items-center justify-between gap-4 py-1">
            <span className="text-sm">
              <span className="font-medium text-foreground">Colour-blind mode</span>
              <span className="block text-muted-foreground">Adds a shape to each tile so colour isn&apos;t the only cue.</span>
            </span>
            <input
              type="checkbox"
              checked={colorblind}
              onChange={(e) => onColorblindChange(e.target.checked)}
              className="size-5 shrink-0 accent-brand"
            />
          </label>
        )}

        <DialogDescription>
          Light and dark mode follow the site theme toggle in the header.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
