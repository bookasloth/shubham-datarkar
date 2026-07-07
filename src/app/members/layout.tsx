import type { Metadata } from "next";
import { getMemberContext } from "@/lib/members/session";
import { getActiveAnnouncement } from "@/lib/members/queries";
import { MembersShell } from "@/components/members/shell";

export const metadata: Metadata = {
  title: { default: "Members", template: "%s | Members" },
  robots: { index: false, follow: false },
};

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ctx, announcement] = await Promise.all([
    getMemberContext(),
    getActiveAnnouncement(),
  ]);

  return (
    <div data-members>
      <MembersShell
        user={ctx.user ? { email: ctx.user.email ?? "" } : null}
        role={ctx.role}
        announcement={announcement}
      >
        {children}
      </MembersShell>
    </div>
  );
}
