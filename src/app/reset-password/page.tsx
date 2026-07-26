import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/app/auth-shell";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = buildMetadata({
  title: "Reset password",
  description: "Choose a new password.",
  path: "/reset-password",
  noIndex: true,
});

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <AuthShell>
      <div className="w-full">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Choose a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a new password for your account.
            </p>
          </div>
          <Card className="p-6">
            {code ? (
              <ResetPasswordForm code={code} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This reset link is missing its code.{" "}
                <Link href="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Request a new one
                </Link>
                .
              </p>
            )}
          </Card>
        </div>
    </AuthShell>
  );
}
