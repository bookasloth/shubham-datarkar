import { PageHeader } from "@/components/admin";
import { runFullAudit } from "@/lib/seo/audit";
import { PagesTable } from "./pages-table";
import { rerunAudit } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSeoPagesPage() {
  const audit = await runFullAudit();
  const publicPages = audit.pages.filter((p) => !p.entry.isPrivate);
  const { unreachablePages } = audit.summary;

  return (
    <div>
      <PageHeader
        title="SEO Pages"
        description={
          `${publicPages.length} public pages. Sort by score or issues to find what needs attention.` +
          (unreachablePages > 0 ? ` ${unreachablePages} could not be fetched.` : "")
        }
      />
      <form action={rerunAudit} className="mb-4">
        <button
          type="submit"
          className="rounded-md border border-admin-border px-3 py-1.5 text-sm text-admin-text hover:bg-admin-surface"
        >
          Re-run audit
        </button>
      </form>
      <PagesTable pages={publicPages} />
    </div>
  );
}
