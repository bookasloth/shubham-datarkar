import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/app/login-form";

export const metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to your account.",
  path: "/login",
  noIndex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo showWordmark={false} />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your dashboard.</p>
          </div>
          {reset === "1" && (
            <div
              className="mb-4 rounded-card border border-border bg-card p-3 text-center text-sm text-muted-foreground"
              role="status"
            >
              Password updated. Sign in with your new password.
            </div>
          )}
          <Card className="p-6">
            <LoginForm />
          </Card>
          <p className="mt-3 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Forgot your password?
            </Link>
          </p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/newsletter" className="font-medium text-foreground underline-offset-4 hover:underline">
              Join the newsletter
            </Link>{" "}
            to get started.
          </p>
        </div>
      </Container>
    </Section>
  );
}
