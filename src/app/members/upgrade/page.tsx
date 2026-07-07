import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { getActivePlans } from "@/lib/members/membership-server";
import { UpgradePanel } from "@/components/members/upgrade-panel";

export const metadata = { title: "Go premium" };

export default async function UpgradePage() {
  const [{ user, role }, plans] = await Promise.all([
    getMemberContext(),
    getActivePlans(),
  ]);

  if (role === "premium") redirect("/members/account");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Go premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One membership. Every prompt, template, workflow, tool, and download — plus everything
          that ships next.
        </p>
      </header>

      <UpgradePanel plans={plans} email={user?.email ?? undefined} signedIn={!!user} />
    </div>
  );
}
