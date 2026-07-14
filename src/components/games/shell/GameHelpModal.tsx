"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GameKey } from "@/lib/games/registry";
import { HELP } from "@/lib/games/help-content";

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
