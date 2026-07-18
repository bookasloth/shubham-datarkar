import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
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
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <RegisterForm next={safeNext(next ?? null) ?? ""} />
      </Container>
    </Section>
  );
}
