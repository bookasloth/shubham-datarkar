import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { auditSinglePage } from "@/lib/seo/audit";
import { PageDetail } from "./page-detail";

export const dynamic = "force-dynamic";

export default async function AdminSeoPageDetail({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const route = `/${decodeURIComponent(page === "home" ? "" : page)}`;
  const data = await auditSinglePage(route);
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={route}
        description={`SEO: ${data.scores.seo.score}% | GEO: ${data.scores.geo.score}% | AEO: ${data.scores.aeo.score}%`}
      />
      <PageDetail data={data} />
    </div>
  );
}
