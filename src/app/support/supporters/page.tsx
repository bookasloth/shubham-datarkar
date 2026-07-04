import { buildMetadata } from "@/lib/seo";
import { StatsBar } from "@/components/support/stats-bar";
import { TierSection } from "@/components/support/tier-section";
import { ClosingCta } from "@/components/support/closing-cta";
import { TIERS } from "@/lib/support/config";
import { tierFor } from "@/lib/support/tiers";
import { getSupporters, getSupportStats } from "@/lib/support/queries";

export const metadata = buildMetadata({
  title: "Supporters",
  description: "The people keeping the lights on. Coffees, toffees, and the wall of thanks.",
  path: "/support/supporters",
});

export default async function SupportersPage() {
  const [supporters, stats] = await Promise.all([getSupporters(), getSupportStats()]);

  const byTier = TIERS.map((tier) => ({
    tier,
    people: supporters
      .filter((s) => tierFor(s.lifetime)?.key === tier.key)
      .sort((a, b) => b.lifetime - a.lifetime),
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">Supporters</h2>
        <p className="text-sm text-muted-foreground">The people keeping the lights on. Thank you.</p>
      </div>
      <StatsBar stats={stats} />
      <div className="grid gap-4">
        {byTier.map(({ tier, people }) => (
          <TierSection key={tier.key} tier={tier} supporters={people} />
        ))}
      </div>
      <ClosingCta />
    </div>
  );
}
