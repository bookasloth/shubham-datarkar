import { PageHeader } from "@/components/admin";
import { runFullAudit } from "@/lib/seo/audit";
import { PagesTable } from "./pages-table";

export const dynamic = "force-dynamic";

export default async function AdminSeoPagesPage() {
  const audit = await runFullAudit();
  const publicPages = audit.pages.filter((p) => !p.entry.isPrivate);
  return (
    <div>
      <PageHeader
        title="SEO Pages"
        description={`${publicPages.length} public pages. Sort by score or issues to find what needs attention.`}
      />
      <PagesTable pages={publicPages} />
    </div>
  );
}
