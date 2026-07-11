import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = buildMetadata({
  title: "Forgot password",
  description: "Reset your password.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo showWordmark={false} />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll email you a link to set a new one.
            </p>
          </div>
          <Card className="p-6">
            <ForgotPasswordForm />
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
