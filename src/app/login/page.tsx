import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/app/auth-shell";
import { LoginForm } from "@/components/app/login-form";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { loginDestination, safeNext } from "@/lib/auth/redirect";

export const metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to your account.",
  path: "/login",
  noIndex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; check?: string; error?: string; next?: string }>;
}) {
  const { reset, check, error, next } = await searchParams;

  // Already signed in? Skip the form and go straight to the destination. This
  // is the single entry point — /members/login and /games/login redirect here.
  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (user) redirect(loginDestination(next ?? null, user.email));

  return (
    <AuthShell>
      <LoginForm
        next={safeNext(next ?? null) ?? ""}
        check={check === "1"}
        reset={reset === "1"}
        errorParam={error}
      />
    </AuthShell>
  );
}
