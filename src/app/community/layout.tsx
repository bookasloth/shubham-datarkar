import type { Metadata } from "next";
import { site } from "@/lib/site";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";
import { CommunityRail } from "@/components/community/community-rail";

export const metadata: Metadata = {
  title: { default: "Community", template: "%s | Community" },
  description:
    "A build-in-public community for marketers, entrepreneurs, and developers — share what you're shipping, swap playbooks, and grow alongside people doing the work.",
  // Without this, the ?sort=&window= permutations the feed reads are each
  // indexable as separate duplicate URLs. Collapse them to the bare hub.
  alternates: { canonical: `${site.url}/community` },
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await getShellUser();
  return (
    <AppShell user={user} rail={<CommunityRail />}>
      <div className="min-w-0">{children}</div>
    </AppShell>
  );
}
