import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import { requireMember } from "@/lib/members/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { signOut } from "@/lib/members/auth-actions";
import { CancelMembershipButton } from "@/components/members/cancel-membership-button";
import { Button } from "@/components/ui/button";
import { getSubscriptionStatus } from "@/lib/subscribers/queries";
import { getMyDonations } from "@/lib/support/queries";
import { NewsletterPrefs } from "@/components/members/newsletter-prefs";
import { PersonalDetailsCard } from "@/components/members/personal-details-card";
import UsernameForm from "@/components/games/UsernameForm";
import { AvatarUploader } from "@/components/members/avatar-uploader";
import { getMyAccount } from "@/lib/members/account-queries";

export const metadata = buildMetadata({ title: "Account", path: "/members/account", noIndex: true });

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const { user, role, membership } = await requireMember("/members/account");

  const supabase = await supabaseAuthServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user!.id)
    .maybeSingle();

  const [subStatus, donations, account] = await Promise.all([
    getSubscriptionStatus(user!.email!),
    getMyDonations(user!.email!),
    getMyAccount(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Account</h1>
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <PersonalDetailsCard
          email={user!.email ?? ""}
          username={profile?.username ?? "—"}
          initial={{
            fullName: account.full_name ?? "",
            dob: account.date_of_birth ?? "",
            location: account.location ?? "",
            whatsapp: account.whatsapp ?? "",
          }}
        />

        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Photo</h2>
          <div className="mt-3">
            <AvatarUploader
              seed={profile?.username ?? user!.email ?? "member"}
              current={(profile?.avatar_url as string | null) ?? null}
            />
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Username</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Changing your handle breaks old links to your profile and past @mentions of you.
          </p>
          <div className="mt-3">
            <UsernameForm current={profile?.username ?? ""} />
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Membership</h2>
            <span className="rounded-btn bg-accent px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
              {role === "premium" ? "Member" : role === "admin" ? "Admin" : "Free"}
            </span>
          </div>

          {membership ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="capitalize">{membership.planKey.replace("-", " ")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{membership.status}</dd>
              </div>
              {membership.currentPeriodEnd && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {membership.status === "cancelled" ? "Access until" : "Renews by"}
                  </dt>
                  <dd>{formatDay(membership.currentPeriodEnd)}</dd>
                </div>
              )}
              {membership.status === "active" && (
                <div className="pt-2">
                  <CancelMembershipButton />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">
                You are on the Free tier. Membership unlocks everything.
              </p>
              {role !== "admin" && (
                <Link
                  href="/members/upgrade"
                  className="mt-3 inline-block rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
                >
                  Become a Member
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Newsletter</h2>
          <NewsletterPrefs initialActive={subStatus === "active"} />
        </section>

        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Donations</h2>
          {donations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No contributions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {donations.map((d) => (
                <li key={d.id} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{formatDay(d.createdAt)}</span>
                  <span className="tabular-nums">INR {d.total}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Session</h2>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
