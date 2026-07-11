import Link from "next/link";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
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
  searchParams: Promise<{ reset?: string; error?: string; next?: string }>;
}) {
  const { reset, error, next } = await searchParams;

  // Already signed in? Skip the form and go straight to the destination. This
  // is the single entry point — /members/login and /games/login redirect here.
  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (user) redirect(loginDestination(next ?? null, user.email));

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo showWordmark={false} />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account.</p>
          </div>
          {reset === "1" && (
            <div
              className="mb-4 rounded-card border border-border bg-card p-3 text-center text-sm text-muted-foreground"
              role="status"
            >
              Password updated. Sign in with your new password.
            </div>
          )}
          {error === "link" && (
            <div
              className="mb-4 rounded-card border border-destructive/40 bg-card p-3 text-center text-sm text-destructive"
              role="alert"
            >
              That sign-in link was invalid or expired. Request a new one.
            </div>
          )}
          <Card className="p-6">
            <LoginForm next={safeNext(next ?? null) ?? ""} />
          </Card>
          <p className="mt-3 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Forgot your password?
            </Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
