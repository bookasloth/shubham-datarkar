import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getMemberContext } from "@/lib/members/session";
import { getActivePlans } from "@/lib/members/membership-server";
import { UpgradePanel } from "@/components/members/upgrade-panel";

export const metadata = buildMetadata({ title: "Become a Member", path: "/members/upgrade", noIndex: true });

const FREE_INCLUDES = [
  "Today's puzzle and yesterday's puzzle",
  "Public blogs and case studies",
  "Selected assets and videos",
  "Public tools",
];

const MEMBER_INCLUDES = [
  "The full game archive",
  "Every Member blog and case study",
  "The complete asset library and prompt library",
  "Member videos, courses, and albums",
  "All downloads and templates",
  "Streaks, achievements, and early access",
];

export default async function UpgradePage() {
  const [{ user, role }, plans] = await Promise.all([
    getMemberContext(),
    getActivePlans(),
  ]);

  if (role === "premium") redirect("/members/account");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Become a Member</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One membership unlocks the complete ecosystem — every prompt, template, workflow, tool,
          download, and the full game archive, plus everything that ships next.
        </p>
      </header>

      {/* Free vs Member */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Free</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Always useful, no account required.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {FREE_INCLUDES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-foreground bg-card p-5">
          <h2 className="font-display text-base font-semibold">Member</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">The complete experience.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {MEMBER_INCLUDES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <UpgradePanel plans={plans} email={user?.email ?? undefined} signedIn={!!user} />
    </div>
  );
}
