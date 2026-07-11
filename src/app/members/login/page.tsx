import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = buildMetadata({ title: "Sign in", path: "/members/login", noIndex: true });

/** Consolidated: the one login lives at /login. Preserve the return path. */
export default async function MembersLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(`/login?next=${encodeURIComponent(safeNext(next ?? null) ?? "/members")}`);
}
