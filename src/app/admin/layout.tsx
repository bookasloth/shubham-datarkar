import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/layout/admin-shell";

// Defense-in-depth: requireAdmin() already blocks non-admins, but a noindex on
// the whole subtree means a leaked URL is never indexed either.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={{ email: user.email ?? "" }}>{children}</AdminShell>;
}
