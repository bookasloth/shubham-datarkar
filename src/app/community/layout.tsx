import type { Metadata } from "next";
import { listAds } from "@/lib/community/queries";
import { AdSlotView } from "@/components/community/ad-slot";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";

export const metadata: Metadata = {
  title: { default: "Community", template: "%s | Community" },
  description: "The Shubham Datarkar community — build in public, share, discuss.",
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const [user, ads] = await Promise.all([getShellUser(), listAds()]);
  const bySlot = (n: 1 | 2) =>
    ads.find((a) => a.slot === n) ?? { slot: n, imagePath: null, linkUrl: null };
  return (
    <AppShell user={user}>
      <div className="mx-auto flex max-w-4xl gap-6 px-4">
        <div className="min-w-0 flex-1 border-x border-border">{children}</div>
        <aside className="hidden w-72 shrink-0 p-4 lg:block">
          <div className="sticky top-[4.5rem] space-y-4">
            <AdSlotView ad={bySlot(1)} />
            <AdSlotView ad={bySlot(2)} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
