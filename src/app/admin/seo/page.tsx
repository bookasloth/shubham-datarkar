import { PageHeader } from "@/components/admin";
import { runFullAudit } from "@/lib/seo/audit";
import { SeoDashboard } from "./seo-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const audit = await runFullAudit();
  return (
    <div>
      <PageHeader
        title="SEO Dashboard"
        description={`${audit.summary.totalPages} public pages analyzed. Avg SEO: ${audit.summary.avgSeoScore}%, GEO: ${audit.summary.avgGeoScore}%, AEO: ${audit.summary.avgAeoScore}%.`}
      />
      <SeoDashboard summary={audit.summary} />
    </div>
  );
}
