import type { Service } from "@/lib/data/types";
import { getPublishedEntityBySlug } from "@/lib/content/queries";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Service — Shubham Datarkar";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getPublishedEntityBySlug<Service>("services", slug);
  const priced = service && service.startingAt.trim().toLowerCase() !== "on request";
  return ogImage({
    eyebrow: "Service",
    title: service?.name ?? "Services",
    metric: priced ? service!.startingAt : undefined,
    metricLabel: priced ? "starting from" : undefined,
  });
}
