"use client";

import * as React from "react";
import { Crown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { initialsOf, formatMoney } from "@/lib/support/config";
import { avatarUrl, avatarBg, cn } from "@/lib/utils";
import type { Supporter } from "@/lib/support/queries";

const displayName = (name: string | null) => name ?? "Anonymous";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex-1 rounded-card border border-border bg-card p-3">
      <div className="font-display text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * The clickable supporter tiles for one tier + a right-side modal (glass sheet,
 * styled like the projects modal) showing the note they left. Client-only so the
 * tier header (colored icon) can stay server-rendered.
 */
export function TierPeople({
  supporters,
  isTop,
  tierLabel,
  max = 12,
}: {
  supporters: Supporter[];
  isTop: boolean;
  tierLabel: string;
  max?: number;
}) {
  const [active, setActive] = React.useState<Supporter | null>(null);
  const shown = supporters.slice(0, max);
  const extra = Math.max(0, supporters.length - shown.length);

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-3">
        {shown.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(s)}
            title={displayName(s.name)}
            className="flex w-16 flex-col items-center gap-1.5 rounded-btn text-center transition-ui hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="relative">
              <Avatar
                style={{ background: avatarBg(s.key) }}
                className={cn(
                  "size-12 rounded-full",
                  isTop ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "ring-1 ring-border",
                )}
              >
                <AvatarImage src={avatarUrl(s.key)} alt="" />
                <AvatarFallback className="rounded-full text-xs font-semibold">
                  {initialsOf(displayName(s.name))}
                </AvatarFallback>
              </Avatar>
              {isTop && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-foreground text-background">
                  <Crown className="size-2.5" />
                </span>
              )}
            </div>
            <span className="w-full truncate text-xs text-muted-foreground">{displayName(s.name).split(" ")[0]}</span>
          </button>
        ))}
        {extra > 0 && (
          <div className="flex w-16 items-center justify-center text-xs text-muted-foreground">+{extra} more</div>
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="border-l-white/20 bg-card/80 backdrop-blur-xl">
          {active && (
            <>
              <SheetHeader className="items-center text-center">
                <Avatar
                  style={{ background: avatarBg(active.key) }}
                  className="size-20 rounded-full ring-1 ring-border"
                >
                  <AvatarImage src={avatarUrl(active.key)} alt="" />
                  <AvatarFallback className="rounded-full text-lg font-semibold">
                    {initialsOf(displayName(active.name))}
                  </AvatarFallback>
                </Avatar>
                <SheetTitle>{displayName(active.name)}</SheetTitle>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tierLabel}</p>
              </SheetHeader>
              <SheetBody className="space-y-5">
                {active.message ? (
                  <blockquote className="rounded-card border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground/90">
                    &ldquo;{active.message}&rdquo;
                  </blockquote>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">No note left — just quiet support.</p>
                )}
                <div className="flex gap-3 text-center">
                  <Stat label="Coffees" value={active.coffees} />
                  <Stat label="Toffees" value={active.toffees} />
                  <Stat label="Lifetime" value={formatMoney(active.lifetime)} />
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
