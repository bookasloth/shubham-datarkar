import { Crown, Flame, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsOf, type Tier } from "@/lib/support/config";
import type { MockSupporter } from "@/lib/data/support-content";
import { cn } from "@/lib/utils";

const ICON = { crown: Crown, shield: Shield, flame: Flame } as const;

/**
 * A ranked tier of supporters. Rank shown by icon + ring weight, never color.
 * Top tier (Pillars) gets the heavy ring + a crown badge.
 */
export function TierSection({
  tier,
  supporters,
  max = 12,
}: {
  tier: Tier;
  supporters: MockSupporter[];
  max?: number;
}) {
  const Icon = ICON[tier.icon];
  const isTop = tier.key === "pillars";
  const shown = supporters.slice(0, max);
  const extra = Math.max(0, supporters.length - shown.length);

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-btn border",
              isTop ? "border-foreground bg-foreground text-background" : "border-border",
            )}
          >
            <Icon className="size-4.5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold tracking-tight">{tier.label}</h2>
            <p className="text-xs text-muted-foreground">{tier.blurb}</p>
          </div>
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">{supporters.length}</span>
      </header>

      {supporters.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No one here yet — be the first.</p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          {shown.map((s) => (
            <div key={s.name} className="flex w-16 flex-col items-center gap-1.5 text-center" title={s.name}>
              <div className="relative">
                <Avatar
                  className={cn(
                    "size-12 rounded-full",
                    isTop
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                      : "ring-1 ring-border",
                  )}
                >
                  <AvatarFallback className="rounded-full text-xs font-semibold">{initialsOf(s.name)}</AvatarFallback>
                </Avatar>
                {isTop && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-foreground text-background">
                    <Crown className="size-2.5" />
                  </span>
                )}
              </div>
              <span className="w-full truncate text-xs text-muted-foreground">{s.name.split(" ")[0]}</span>
            </div>
          ))}
          {extra > 0 && (
            <div className="flex w-16 items-center justify-center text-xs text-muted-foreground">+{extra} more</div>
          )}
        </div>
      )}
    </section>
  );
}
