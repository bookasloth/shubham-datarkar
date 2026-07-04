import { requireAdmin } from "@/lib/auth/session";
import { getAllCategoriesWithLinksAdmin } from "@/lib/links/queries";
import { LinkManager } from "@/components/admin/link-manager";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  await requireAdmin();
  const categories = await getAllCategoriesWithLinksAdmin();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Links</h1>
      <LinkManager categories={categories} />
    </div>
  );
}
