import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/app/auth-shell";
import { getMemberContext } from "@/lib/members/session";
import { getActivePlans } from "@/lib/members/membership-server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { safeNext } from "@/lib/auth/redirect";
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard";

export const metadata = buildMetadata({
  title: "Welcome",
  description: "Finish setting up your account.",
  path: "/welcome",
  noIndex: true,
});

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const { user, role } = await getMemberContext();
  if (!user) redirect("/login");

  const supabase = await supabaseAuthServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already onboarded → don't repeat the wizard.
  if (profile?.onboarded_at) redirect(safeNext(next ?? null) ?? "/members");

  const plans = await getActivePlans();

  return (
    <AuthShell>
      <WelcomeWizard
        initialUsername={profile?.username ?? ""}
        plans={plans}
        email={user.email ?? undefined}
        isPremium={role === "premium" || role === "admin"}
        next={safeNext(next ?? null)}
      />
    </AuthShell>
  );
}
