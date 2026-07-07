import Link from "next/link";
import { requireMember } from "@/lib/members/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { signOut } from "@/lib/members/auth-actions";
import { CancelMembershipButton } from "@/components/members/cancel-membership-button";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account" };

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
    .select("username")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Account</h1>
      </header>

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate">{user!.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Username</dt>
            <dd>{profile?.username ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Membership</h2>
          <span className="rounded-btn bg-accent px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {role === "premium" ? "Premium" : role === "admin" ? "Admin" : "Free member"}
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
              You are on the free tier. Premium unlocks everything.
            </p>
            {role !== "admin" && (
              <Link
                href="/members/upgrade"
                className="mt-3 inline-block rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
              >
                Go premium
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Session</h2>
        <form action={signOut} className="mt-3">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </section>
    </div>
  );
}
