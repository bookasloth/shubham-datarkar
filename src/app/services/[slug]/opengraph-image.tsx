import type { Service } from "@/lib/data/types";
import { getPublishedEntityBySlug } from "@/lib/content/queries";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Service — Shubham Datarkar";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getPublishedEntityBySlug<Service>("services", slug);
  return ogImage({
    category: "Service",
    title: service?.name ?? "Services",
    subtitle: service?.tagline ?? service?.outcome,
    kind: "services",
  });
}
