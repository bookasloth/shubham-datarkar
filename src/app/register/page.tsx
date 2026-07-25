import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/app/auth-shell";
import { RegisterForm } from "@/components/app/register-form";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { loginDestination, safeNext } from "@/lib/auth/redirect";

export const metadata = buildMetadata({
  title: "Create account",
  description: "Create your account.",
  path: "/register",
  noIndex: true,
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (user) redirect(loginDestination(next ?? null, user.email));

  return (
    <AuthShell>
      <RegisterForm next={safeNext(next ?? null) ?? ""} />
    </AuthShell>
  );
}
