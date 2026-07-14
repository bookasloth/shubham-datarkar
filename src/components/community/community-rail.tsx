import { listAds } from "@/lib/community/queries";
import { AdSlotView } from "@/components/community/ad-slot";

export async function CommunityRail() {
  const ads = await listAds();
  const bySlot = (n: 1 | 2) =>
    ads.find((a) => a.slot === n) ?? { slot: n, imagePath: null, linkUrl: null };
  return (
    <div className="space-y-4">
      <AdSlotView ad={bySlot(1)} />
      <AdSlotView ad={bySlot(2)} />
    </div>
  );
}
