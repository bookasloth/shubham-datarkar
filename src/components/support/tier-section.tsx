import { Crown, Flame, Shield } from "lucide-react";
import { type Tier, type TierKey } from "@/lib/support/config";
import type { Supporter } from "@/lib/support/queries";
import { cn } from "@/lib/utils";
import { TierPeople } from "./tier-people";

const ICON = { crown: Crown, shield: Shield, flame: Flame } as const;

// Per-tier icon accent — explicit colour request (overrides the usual monochrome):
// Pillars = orange-filled crown, Guardians = blue-outlined shield, Torchbearers unchanged.
const TIER_STYLE: Record<TierKey, { wrap: string; icon: string }> = {
  pillars: { wrap: "border-brand/30 bg-brand/10", icon: "size-4.5 fill-brand text-brand" },
  guardians: { wrap: "border-blue-500/50", icon: "size-4.5 text-blue-500" },
  torchbearers: { wrap: "border-border", icon: "size-4.5" },
};

/**
 * A ranked tier of supporters. Rank shown by icon + ring weight; the tier icon
 * carries an explicit accent (Pillars orange, Guardians blue) per request.
 * Top tier (Pillars) gets the heavy ring + a crown badge.
 */
export function TierSection({
  tier,
  supporters,
  max = 12,
}: {
  tier: Tier;
  supporters: Supporter[];
  max?: number;
}) {
  const Icon = ICON[tier.icon];
  const style = TIER_STYLE[tier.key];
  const isTop = tier.key === "pillars";

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-9 items-center justify-center rounded-btn border", style.wrap)}>
            <Icon className={style.icon} />
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
        <TierPeople supporters={supporters} isTop={isTop} tierLabel={tier.label} max={max} />
      )}
    </section>
  );
}
