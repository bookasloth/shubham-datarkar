import { buildMetadata } from "@/lib/seo";
import { StatsBar } from "@/components/support/stats-bar";
import { TierSection } from "@/components/support/tier-section";
import { ClosingCta } from "@/components/support/closing-cta";
import { TIERS } from "@/lib/support/config";
import { tierFor } from "@/lib/support/tiers";
import { supportSupporters } from "@/lib/data/support-content";

export const metadata = buildMetadata({
  title: "Supporters",
  description: "The people keeping the lights on. Coffees, toffees, and the wall of thanks.",
  path: "/support/supporters",
});

export default function SupportersPage() {
  const byTier = TIERS.map((tier) => ({
    tier,
    people: supportSupporters
      .filter((s) => tierFor(s.lifetime)?.key === tier.key)
      .sort((a, b) => b.lifetime - a.lifetime),
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Supporters</h2>
        <p className="mt-1 text-sm text-muted-foreground">The people keeping the lights on. Thank you.</p>
      </div>
      <StatsBar />
      <div className="grid gap-4">
        {byTier.map(({ tier, people }) => (
          <TierSection key={tier.key} tier={tier} supporters={people} />
        ))}
      </div>
      <ClosingCta />
    </div>
  );
}
