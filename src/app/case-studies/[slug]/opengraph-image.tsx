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
    category: study ? `Case Study · ${study.sector}` : "Case Study",
    title: study?.title ?? "Case Study",
    subtitle: study ? `${study.heroMetric.value} — ${study.heroMetric.label}` : undefined,
    kind: "case",
  });
}
