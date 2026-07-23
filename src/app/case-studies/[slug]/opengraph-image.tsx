import type { CaseStudy } from "@/lib/data/types";
import { getPublishedEntityBySlug } from "@/lib/content/queries";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Case study — Shubham Datarkar";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = await getPublishedEntityBySlug<CaseStudy>("case_studies", slug);
  return ogImage({
    eyebrow: study ? `Case Study · ${study.sector}` : "Case Study",
    title: study?.title ?? "Case Study",
    metric: study?.heroMetric.value,
    metricLabel: study?.heroMetric.label,
  });
}
