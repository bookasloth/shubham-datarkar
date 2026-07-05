import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={{ email: user.email ?? "" }}>{children}</AdminShell>;
}
