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

export default function IntegraSettingsModal({
  colorblind,
  onColorblindChange,
}: {
  colorblind: boolean;
  onColorblindChange: (v: boolean) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger className={triggerCls}>Settings</DialogTrigger>
      <DialogContent data-game="integra" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

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

        <DialogDescription>
          Light and dark mode follow the site theme toggle in the header.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
