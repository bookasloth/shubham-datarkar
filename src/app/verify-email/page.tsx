import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck, ExternalLink, ArrowRight } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/app/auth-shell";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { orderedProviders } from "@/lib/auth/mail-providers";
import { safeNext, loginDestination } from "@/lib/auth/redirect";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export const metadata = buildMetadata({
  title: "Verify your email",
  description: "Confirm your email to finish setting up your account.",
  path: "/verify-email",
  noIndex: true,
});

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;

  // This screen is only meaningful for the just-signed-up (they have a session).
  const {
    data: { user },
  } = await (await supabaseAuthServer()).auth.getUser();
  if (!user) redirect("/login");
  if (user.email_confirmed_at) redirect(loginDestination(next ?? null, user.email));

  const address = email ?? user.email ?? "";
  const skipHref = loginDestination(safeNext(next ?? null), user.email);

  return (
    <AuthShell>
      <div className="w-full">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo />
            <MailCheck className="mt-5 size-8 text-foreground" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{address}</span>. Open it to verify your
              account.
            </p>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-2 gap-2">
              {orderedProviders(address).map((p) => (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-btn border border-border px-3 py-2 text-sm transition-ui hover:bg-accent"
                >
                  {p.label}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Nothing there? Check spam — it arrives within a minute.
            </p>
          </Card>

          <p className="mt-4 text-center text-sm">
            <Link
              href={skipHref}
              className="inline-flex items-center gap-1 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Skip for now, take me in
              <ArrowRight className="size-3.5" />
            </Link>
          </p>
        </div>
    </AuthShell>
  );
}
