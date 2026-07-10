import type { Metadata } from "next";
import { listAds } from "@/lib/community/queries";
import { AdSlotView } from "@/components/community/ad-slot";
import { LeftNav } from "@/components/community/left-nav";

export const metadata: Metadata = {
  title: { default: "Community", template: "%s | Community" },
  description: "The Shubham Datarkar community — build in public, share, discuss.",
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const ads = await listAds();
  const bySlot = (n: 1 | 2): { slot: 1 | 2; imagePath: string | null; linkUrl: string | null } =>
    ads.find((a) => a.slot === n) ?? { slot: n, imagePath: null, linkUrl: null };
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4">
      <aside className="hidden w-56 shrink-0 py-4 md:block">
        <div className="sticky top-4">
          <LeftNav />
        </div>
      </aside>
      <main className="min-w-0 flex-1 border-x border-border">{children}</main>
      <aside className="hidden w-72 shrink-0 py-4 lg:block">
        <div className="sticky top-4 space-y-4">
          <AdSlotView ad={bySlot(1)} />
          <AdSlotView ad={bySlot(2)} />
        </div>
      </aside>
    </div>
  );
}
