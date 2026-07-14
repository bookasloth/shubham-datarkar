import type { Metadata } from "next";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";
import { MembersRail } from "@/components/members/MembersRail";

export const metadata: Metadata = {
  title: { default: "Members", template: "%s | Members" },
  robots: { index: false, follow: false },
};

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const user = await getShellUser();
  return (
    <div data-members>
      <AppShell user={user} rail={<MembersRail />}>
        <div className="pt-6">{children}</div>
      </AppShell>
    </div>
  );
}
