import { requireAdmin } from "@/lib/auth/session";
import { getAllCategoriesWithLinksAdmin } from "@/lib/links/queries";
import { LinkManager } from "@/components/admin/link-manager";
import { PageHeader } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  await requireAdmin();
  const categories = await getAllCategoriesWithLinksAdmin();

  return (
    <div>
      <PageHeader title="Links" />
      <LinkManager categories={categories} />
    </div>
  );
}
