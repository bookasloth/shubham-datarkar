import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { safeMembersNext } from "@/lib/members/safe-next";
import MembersAuthForm from "@/components/members/auth-form";

export const metadata = buildMetadata({ title: "Sign in", path: "/members/login", noIndex: true });

export default async function MembersLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const safeNext = safeMembersNext(next ?? null);

  const { user } = await getMemberContext();
  if (user) redirect(safeNext);

  return <MembersAuthForm next={safeNext} initialMode={mode === "signup" ? "up" : "in"} />;
}
